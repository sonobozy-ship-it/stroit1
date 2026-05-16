using System.Linq;
using UnityEngine;

public class ProjectSystem : MonoBehaviour
{
    [SerializeField] private ContractDefinition[] _allContracts;

    private const float TICKS_PER_DAY = 30f;

    // ──────────────────────────────────────────────
    public void ProcessTick(GameState state)
    {
        var p = state.CurrentProject;
        if (p == null || p.Phase == ProjectPhase.Completed) return;

        switch (p.Phase)
        {
            case ProjectPhase.Procurement:
                ProcessProcurement(p, state);
                break;
            case ProjectPhase.Construction:
            case ProjectPhase.Finishing:
                ProcessBuilding(p, state);
                break;
            case ProjectPhase.Documents:
                // Documents are player-triggered, just add deadline pressure
                AddDeadlinePressure(p, state);
                break;
            case ProjectPhase.WaitingPayment:
                // Payment handled in FinanceSystem
                break;
        }

        // Deadline pressure (common to all phases)
        var daysLeft = p.DeadlineDay - state.Day;
        if (daysLeft <= 3 && daysLeft > 0)
        {
            state.Stress = Mathf.Min(100, state.Stress + 0.5f);
            if (state.Tick % 30 == 0)
                GameManager.Instance.AddLog($"⏰ {p.Client} звонит каждый час. До дедлайна {daysLeft} дн.");
        }
        else if (daysLeft < 0)
        {
            state.Stress = Mathf.Min(100, state.Stress + 1f);
            p.AccruedPenalties += CalculateDailyPenalty(p);
            if (state.Tick % 30 == 0)
                GameManager.Instance.AddLog($"💸 Просрочка. Штраф за сегодня: {CalculateDailyPenalty(p):N0} ₽.");
        }
    }

    private void ProcessProcurement(ProjectState p, GameState state)
    {
        // Procurement completes automatically over some ticks
        p.PhaseProgress += 5f;
        if (p.PhaseProgress >= 100)
        {
            p.Phase = ProjectPhase.Construction;
            p.PhaseProgress = 0;
            GameManager.Instance.AddLog($"🚚 Материалы доставлены. Бригада выезжает на {p.Name}.");
        }
    }

    private void ProcessBuilding(ProjectState p, GameState state)
    {
        var activeWorkers = state.HiredWorkers
            .Where(w => !w.IsOnBinge && !w.IsOnAnotherSite)
            .ToList();

        if (activeWorkers.Count == 0) return;

        var totalEff = activeWorkers.Sum(w => w.Efficiency);

        // Foreman bonus: reduces inefficiency
        var hasForeman = activeWorkers.Any(w => w.WorkerId == "petrovich_foreman");
        if (hasForeman) totalEff *= 1.2f;

        var progressPerTick = totalEff / 50f;
        p.Progress = Mathf.Min(100, p.Progress + progressPerTick);

        // Advance phase
        if (p.Phase == ProjectPhase.Construction && p.Progress >= 70)
        {
            p.Phase = ProjectPhase.Finishing;
            GameManager.Instance.AddLog($"🏗️ Основные работы завершены. Переходим к отделке.");
        }

        if (p.Progress >= 100)
        {
            p.Phase = ProjectPhase.Documents;
            p.PhaseProgress = 0;
            GameManager.Instance.AddLog($"✅ {p.Name} — работы завершены! Собираем ИД...");
        }
    }

    private void AddDeadlinePressure(ProjectState p, GameState state)
    {
        var daysLeft = p.DeadlineDay - state.Day;
        if (daysLeft >= 0) return;

        p.OverdueDays = -daysLeft;
        state.Stress = Mathf.Min(100, state.Stress + RemoteConfigService.StressOverduePerTick);

        // Social humiliation: client hires another contractor after 5 days overdue
        if (p.OverdueDays >= 5 && !p.ClientAbandoned && Random.value < 0.02f)
        {
            TriggerClientAbandonment(p, state);
        }
    }

    private void TriggerClientAbandonment(ProjectState p, GameState state)
    {
        p.ClientAbandoned = true;
        p.Phase = ProjectPhase.Completed;

        // Return only partial advance
        var refund = (long)(p.AdvancePaid * 0.3f);
        state.Money += refund;
        state.Reputation = Mathf.Max(0, state.Reputation - 20);
        state.Stress = Mathf.Min(100, state.Stress + 25);

        GameManager.Instance.ClientRelations.RecordAbandonment(p, state);

        GameManager.Instance.AddLog(
            $"💔 {p.Client} устал ждать и нанял другого подрядчика. Возврат аванса: {refund:N0} ₽. Репутация упала.");
        GameManager.Instance.AddLog(
            "📱 В чате прорабов: «Слышали, [ваша компания] кинула заказчика? Не берите их на объекты.»");

        AnalyticsManager.Track("client_abandoned_project",
            ("project", p.Name), ("overdue_days", p.OverdueDays), ("reputation", state.Reputation));

        FinalizeProject(state);
    }

    private long CalculateDailyPenalty(ProjectState p)
    {
        // Typical construction contract: 0.1% per day of delay
        return (long)(p.ContractValue * 0.001f);
    }

    // ──────────────────────────────────────────────
    public void StartProject(string contractId, GameState state)
    {
        var def = GetContract(contractId);
        if (def == null) return;

        var advance = (long)(def.ContractValue * def.AdvancePercent);

        // Pay for materials upfront
        if (state.Money < def.MaterialsCost)
        {
            GameManager.Instance.AddLog($"❌ Недостаточно средств на закупку материалов.");
            return;
        }
        state.Money -= def.MaterialsCost;
        state.Money += advance;

        var docIterations = UnityEngine.Random.Range(def.DocumentIterationsMin, def.DocumentIterationsMax + 1);

        // Document specialist reduces iterations
        var hasDocSpec = state.HiredWorkers.Any(w => w.WorkerId == "doc_specialist");
        if (hasDocSpec) docIterations = Mathf.Max(1, docIterations - 1);

        state.CurrentProject = new ProjectState
        {
            ContractId = contractId,
            Name = def.ContractName,
            Client = def.Client,
            ClientType = def.ClientType,
            Emoji = def.Emoji,
            ContractValue = def.ContractValue,
            AdvancePaid = advance,
            ClientMood = def.ClientMoodStart,
            StartDay = state.Day,
            DeadlineDay = state.Day + def.DurationDays,
            EventMultiplier = def.EventMultiplier,
            DocumentMaxIterations = docIterations,
        };

        AnalyticsManager.Track("contract_started", ("id", contractId), ("value", def.ContractValue));
        GameManager.Instance.AddLog($"🤝 Контракт подписан: {def.ContractName}. Аванс: {advance:N0} ₽. Дедлайн: день {state.Day + def.DurationDays}.");
    }

    public void SignKS2(GameState state)
    {
        var p = state.CurrentProject;
        if (p == null || p.Phase != ProjectPhase.SigningKS2) return;

        p.Ks2Signed = true;

        // Base amount
        var remaining = p.ContractValue - p.AdvancePaid + p.ExtraRevenue - p.AccruedPenalties;
        var moodMultiplier = Mathf.Lerp(0.6f, 1.0f, p.ClientMood / 100f);
        var baseAmount = (long)(remaining * moodMultiplier);

        // Roll outcome secretly — revealed on arrival
        var outcome = GameManager.Instance.Finance.RollPaymentOutcome(p, state);
        p.PaymentOutcomeRolled = outcome;

        // Payment delay (with client relations speed bonus)
        var delayTicks = GetPaymentDelayTicks(p.ClientType);
        var speedBonus = GameManager.Instance.ClientRelations.GetPaymentSpeedBonus(p.ClientId, state);
        delayTicks = Mathf.Max(10, delayTicks - speedBonus);

        var payment = new PendingPayment
        {
            ProjectName = p.Name,
            Client = p.Client,
            Amount = baseAmount,
            Outcome = outcome,
            ArrivalTick = state.Tick + delayTicks,
            ArrivalTickOriginal = state.Tick + delayTicks,
        };

        state.PendingPayments.Add(payment);
        p.Phase = ProjectPhase.WaitingPayment;

        var delayText = FormatTicks(delayTicks);
        GameManager.Instance.AddLog($"📝 КС-2 подписан! Ожидаемая оплата через {delayText}.");

        if (p.ClientType == "goszakaz")
            GameManager.Instance.AddLog("🏛️ КАЗНАЧЕЙСТВО: принято к рассмотрению. «Ориентировочный срок — в течение квартала».");

        AnalyticsManager.Track("ks2_signed",
            ("project", p.Name), ("amount", baseAmount), ("outcome_rolled", outcome.ToString()));
    }

    private int GetPaymentDelayTicks(string clientType)
    {
        return clientType switch
        {
            "normal"     => Random.Range(RemoteConfigService.NormalPaymentMin,    RemoteConfigService.NormalPaymentMax),
            "toxic"      => Random.Range(RemoteConfigService.ToxicPaymentMin,     RemoteConfigService.ToxicPaymentMax),
            "genpodryad" => Random.Range(RemoteConfigService.GenpodradPaymentMin, RemoteConfigService.GenpodradPaymentMax),
            "goszakaz"   => Random.Range(RemoteConfigService.GoszakazPaymentMin,  RemoteConfigService.GoszakazPaymentMax),
            _            => 60,
        };
    }

    private static string FormatTicks(int ticks) => ticks switch
    {
        < 60    => $"{ticks} сек",
        < 3600  => $"{ticks / 60} мин",
        _       => $"{ticks / 3600:F1} ч",
    };

    public void FinalizeProject(GameState state)
    {
        var p = state.CurrentProject;
        if (p == null) return;

        var repDelta = Mathf.RoundToInt((p.ClientMood - 50f) / 10f);
        state.Reputation = Mathf.Clamp(state.Reputation + repDelta, 0, 100);
        state.Stress = Mathf.Max(0, state.Stress - 10);

        var record = new CompletedProjectRecord
        {
            Name = p.Name,
            Client = p.Client,
            Emoji = p.Emoji,
            Earned = p.ContractValue, // simplified
            CompletedDay = state.Day,
            FinalClientMood = p.ClientMood,
            DocumentRejections = p.DocumentRejections,
        };

        state.CompletedProjects.Insert(0, record);
        state.CurrentProject = null;

        // Client relations
        if (!p.ClientAbandoned)
            GameManager.Instance.ClientRelations.RecordCompletion(p, state);

        // Battle pass
        GameManager.Instance.BattlePass.OnProjectCompleted(state, p.ClientMood);
        GameManager.Instance.BattlePass.ProgressTask("complete_projects", state);
        GameManager.Instance.BattlePass.ProgressTask("survive_days", state, state.Day - p.StartDay);

        // Check progression unlocks
        GameManager.Instance.Progression.CheckUnlocks(state);
        AnalyticsManager.TrackContractCompleted(p.ContractId, record.Earned, p.ClientMood, p.DocumentRejections);
    }

    public ContractDefinition GetContract(string id)
    {
        foreach (var c in _allContracts)
            if (c.Id == id) return c;
        return null;
    }

    public ContractDefinition[] GetAvailableContracts(GameState state)
    {
        return System.Array.FindAll(_allContracts, c =>
            state.UnlockedContractIds.Contains(c.Id) &&
            c.RequiredCompanyLevel <= state.CompanyLevel &&
            c.RequiredReputation <= state.Reputation);
    }
}
