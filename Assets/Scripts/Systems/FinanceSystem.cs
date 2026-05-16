using System.Linq;
using UnityEngine;

public class FinanceSystem : MonoBehaviour
{
    // ─────────────────────────────────────────────────────────
    // Tick processing

    public void ProcessDailyCosts(GameState state)
    {
        // Worker salaries
        if (state.HiredWorkers.Count > 0)
        {
            var dailyCost = state.HiredWorkers.Sum(w => w.DailyCost);
            state.Money -= dailyCost;
        }

        // Loan daily interest
        foreach (var loan in state.ActiveLoans)
        {
            state.Money -= loan.DailyInterest;
            loan.TotalOwed += loan.DailyInterest;

            if (state.Tick >= loan.DueTick && !loan.IsOverdue)
            {
                loan.IsOverdue = true;
                OnLoanOverdue(loan, state);
            }
        }

        // Cash flow warnings
        var runway = GetDaysOfRunway(state);
        if (state.Money < 0)
        {
            state.Stress = Mathf.Min(100, state.Stress + 8);
            if (state.Day % 2 == 0)
                GameManager.Instance.AddLog($"🔴 Касса в минусе: {state.Money:N0} ₽. Бригада ждёт денег.");
        }
        else if (runway <= 2)
        {
            state.Stress = Mathf.Min(100, state.Stress + 3);
            GameManager.Instance.AddLog($"⚠️ Осталось на {runway} дн. работы бригады. Кассовый разрыв близко.");
        }

        if (state.Money < -500_000)
        {
            state.Stress = Mathf.Min(100, state.Stress + 15);
            GameManager.Instance.AddLog("💀 Долг критический. Поставщики угрожают. Рабочие бунтуют.");
        }
    }

    public void ProcessPendingPayments(GameState state)
    {
        var arrived = state.PendingPayments.Where(p => state.Tick >= p.ArrivalTick).ToList();
        foreach (var payment in arrived)
        {
            state.PendingPayments.Remove(payment);
            ApplyPaymentArrival(payment, state);
        }
    }

    private void ApplyPaymentArrival(PendingPayment payment, GameState state)
    {
        switch (payment.Outcome)
        {
            case PaymentOutcome.Full:
                state.Money += payment.Amount;
                state.TotalEarned += payment.Amount;
                state.Stress = Mathf.Max(0, state.Stress - 15);
                GameManager.Instance.AddLog($"💰 Оплата пришла! +{payment.Amount:N0} ₽ от {payment.Client}. Касса дышит.");
                break;

            case PaymentOutcome.Partial:
                var partial = (long)(payment.Amount * Random.Range(0.5f, 0.85f));
                state.Money += partial;
                state.TotalEarned += partial;
                state.Stress = Mathf.Min(100, state.Stress + 5);
                state.Reputation = Mathf.Max(0, state.Reputation - 3);
                GameManager.Instance.AddLog(
                    $"😤 {payment.Client} заплатил только {partial:N0} ₽ из {payment.Amount:N0} ₽. «Нашли нарушения в смете».");
                break;

            case PaymentOutcome.Delayed:
                // Reschedule — add more wait
                var extraWait = Random.Range(600, 1800);
                var requeue = new PendingPayment
                {
                    ProjectName = payment.ProjectName,
                    Client = payment.Client,
                    Amount = payment.Amount,
                    Outcome = PaymentOutcome.Full, // delayed once → pays next time
                    ArrivalTick = state.Tick + extraWait,
                    ArrivalTickOriginal = state.Tick + extraWait,
                };
                state.PendingPayments.Add(requeue);
                state.Stress = Mathf.Min(100, state.Stress + 12);
                GameManager.Instance.AddLog(
                    $"🏛️ КАЗНАЧЕЙСТВО: платёж {payment.Amount:N0} ₽ перенесён. «Технические причины». Ждите ещё {extraWait / 60} мин.");
                break;

            case PaymentOutcome.Disappeared:
                state.Stress = Mathf.Min(100, state.Stress + 25);
                state.Reputation = Mathf.Max(0, state.Reputation - 10);
                GameManager.Instance.AddLog(
                    $"🏃 {payment.Client} исчез. {payment.Amount:N0} ₽ потеряны. Телефон недоступен. Говорят, уехал в Дубай.");
                AnalyticsManager.Track("payment_disappeared", ("client", payment.Client), ("amount", payment.Amount));
                break;
        }

        // Finalize project if it was waiting
        if (state.CurrentProject?.Phase == ProjectPhase.WaitingPayment)
            GameManager.Instance.Projects.FinalizeProject(state);

        AnalyticsManager.Track("payment_received",
            ("client", payment.Client),
            ("amount", payment.Amount),
            ("outcome", payment.Outcome.ToString()));
    }

    // ─────────────────────────────────────────────────────────
    // Payment outcome roll

    /// <summary>
    /// Called when КС-2 is signed. Rolls the outcome secretly;
    /// revealed when the payment actually arrives.
    /// </summary>
    public PaymentOutcome RollPaymentOutcome(ProjectState project, GameState state)
    {
        var relation = state.ClientRelations.GetValueOrDefault(project.ClientId);
        var isRegular = relation?.IsRegular ?? false;

        // Regular clients are more reliable
        var roll = Random.value;
        if (isRegular) roll = Mathf.Max(roll, Random.value); // advantage roll

        return project.ClientType switch
        {
            "goszakaz" => roll switch
            {
                < 0.45f => PaymentOutcome.Full,
                < 0.80f => PaymentOutcome.Delayed, // казначейство delays again
                _       => PaymentOutcome.Partial,  // госка never fully disappears
            },
            "toxic" => roll switch
            {
                < 0.35f => PaymentOutcome.Full,
                < 0.65f => PaymentOutcome.Partial,
                < 0.85f => PaymentOutcome.Delayed,
                _       => PaymentOutcome.Disappeared,
            },
            "genpodryad" => roll switch
            {
                < 0.40f => PaymentOutcome.Full,
                < 0.70f => PaymentOutcome.Partial,    // удержания
                < 0.88f => PaymentOutcome.Delayed,
                _       => PaymentOutcome.Disappeared,
            },
            _ => roll switch // "normal"
            {
                < 0.65f => PaymentOutcome.Full,
                < 0.85f => PaymentOutcome.Partial,
                < 0.95f => PaymentOutcome.Delayed,
                _       => PaymentOutcome.Disappeared,
            },
        };
    }

    // ─────────────────────────────────────────────────────────
    // Loans

    public void TakeLoan(LoanType type, long amount, GameState state)
    {
        var (feePercent, daysToRepay, lenderName) = type switch
        {
            LoanType.Bank       => (0.15f, 7,  "Сбербизнес"),
            LoanType.QuickMoney => (0.40f, 3,  "МикроФинанс"),
            LoanType.LoanShark  => (0.80f, 2,  "Дядя Толя"),
            LoanType.FriendLoan => (0.00f, 14, "Коллега Серёга"),
            _                   => (0.30f, 5,  "Неизвестный источник"),
        };

        if (type == LoanType.FriendLoan && state.Connections < 30)
        {
            GameManager.Instance.AddLog("❌ Нужно 30 Связей, чтобы занять у знакомых.");
            return;
        }

        var totalOwed = (long)(amount * (1 + feePercent));
        var dailyInterest = type == LoanType.LoanShark ? (long)(amount * 0.1f) : 0; // loan sharks charge daily
        var dueTick = state.Tick + daysToRepay * 30;

        state.Money += amount;
        state.ActiveLoans.Add(new ActiveLoan
        {
            Id = System.Guid.NewGuid().ToString("N")[..8],
            LenderName = lenderName,
            Type = type,
            PrincipalAmount = amount,
            TotalOwed = totalOwed,
            DailyInterest = dailyInterest,
            DueTick = dueTick,
        });

        state.Stress = Mathf.Min(100, state.Stress + (type == LoanType.LoanShark ? 20 : 5));

        var warning = type switch
        {
            LoanType.LoanShark  => "⚠️ Дядя Толя не шутит. Отдашь вовремя.",
            LoanType.QuickMoney => "💸 МикроФинанс взял подпись. Верни через 3 дня.",
            LoanType.FriendLoan => "🤝 Серёга дал. Не подведи.",
            _                   => "🏦 Кредит одобрен.",
        };
        GameManager.Instance.AddLog($"{warning} Займ: {amount:N0} ₽. Отдать: {totalOwed:N0} ₽ ({daysToRepay} дн.).");
        AnalyticsManager.Track("loan_taken", ("type", type.ToString()), ("amount", amount));
    }

    public void RepayLoan(string loanId, GameState state)
    {
        var loan = state.ActiveLoans.FirstOrDefault(l => l.Id == loanId);
        if (loan == null) return;

        if (state.Money < loan.TotalOwed)
        {
            GameManager.Instance.AddLog($"❌ Не хватает {loan.TotalOwed - state.Money:N0} ₽ для погашения займа у {loan.LenderName}.");
            return;
        }

        state.Money -= loan.TotalOwed;
        state.ActiveLoans.Remove(loan);
        state.Stress = Mathf.Max(0, state.Stress - 10);
        GameManager.Instance.AddLog($"✅ Займ у {loan.LenderName} погашен. Спим спокойно.");
    }

    private void OnLoanOverdue(ActiveLoan loan, GameState state)
    {
        switch (loan.Type)
        {
            case LoanType.LoanShark:
                state.Stress = Mathf.Min(100, state.Stress + 30);
                // Remove a worker — "Дядя Толя забрал рабочих"
                if (state.HiredWorkers.Count > 0)
                {
                    var taken = state.HiredWorkers[0];
                    state.HiredWorkers.RemoveAt(0);
                    GameManager.Instance.AddLog($"💀 Дядя Толя забрал {taken.Name} в счёт долга. Это было неприятно.");
                }
                else
                {
                    GameManager.Instance.AddLog("💀 Дядя Толя очень недоволен. Ждите последствий.");
                }
                break;
            case LoanType.QuickMoney:
                state.Stress = Mathf.Min(100, state.Stress + 15);
                state.Reputation = Mathf.Max(0, state.Reputation - 10);
                GameManager.Instance.AddLog($"⚠️ МикроФинанс передал долг коллекторам. Репутация упала.");
                break;
            default:
                state.Stress = Mathf.Min(100, state.Stress + 8);
                GameManager.Instance.AddLog($"⏰ Просрочка у {loan.LenderName}. Проценты капают.");
                break;
        }
    }

    // ─────────────────────────────────────────────────────────
    // Helpers

    public void SpeedUpPendingPayment(bool usedRewardedAd, GameState state)
    {
        var next = state.PendingPayments.OrderBy(p => p.ArrivalTick).FirstOrDefault();
        if (next == null) return;

        var reduction = usedRewardedAd ? 1800 : 600;
        next.ArrivalTick = Mathf.Max(state.Tick + 5, next.ArrivalTick - reduction);
        GameManager.Instance.AddLog($"📞 {(usedRewardedAd ? "Позвонили в бухгалтерию" : "Связи задействованы")}. Оплата ускорена.");
    }

    public long GetDailyBurn(GameState state) =>
        state.HiredWorkers.Sum(w => w.DailyCost) +
        state.ActiveLoans.Sum(l => l.DailyInterest);

    public int GetDaysOfRunway(GameState state)
    {
        var burn = GetDailyBurn(state);
        if (burn == 0) return 999;
        return Mathf.Max(0, (int)(state.Money / burn));
    }
}
