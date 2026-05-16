using System.Linq;
using UnityEngine;

/// <summary>
/// Foreman theft mechanic.
/// Foremen (Прорабы) have a low but non-zero chance to embezzle material money
/// by writing off purchases that never happened.
/// Player can: ignore, audit receipts (chance-based catch), or install CRM (upgrade).
/// </summary>
public class ForemanTheftSystem : MonoBehaviour
{
    private const float BASE_THEFT_CHANCE_PER_DAY = 0.08f;  // 8% per day per foreman
    private const float CRM_THEFT_REDUCTION       = 0.7f;   // CRM upgrade reduces chance by 70%
    private const float ACCOUNTANT_THEFT_REDUCTION = 0.5f;  // having an accountant helps

    void OnEnable() => GameManager.OnDayChanged += CheckTheft;
    void OnDisable() => GameManager.OnDayChanged -= CheckTheft;

    private void CheckTheft()
    {
        var state = GameManager.Instance.State;
        if (state.CurrentProject == null) return;

        var foremen = state.HiredWorkers.Where(w => w.IsForeman && !w.IsOnBinge).ToList();
        if (foremen.Count == 0) return;

        var hasCrm         = state.PurchasedUpgrades.Contains("crm");
        var hasAccountant  = state.PurchasedUpgrades.Contains("accountant");
        var hasForemanSelf = foremen.Any(w => w.WorkerId == "petrovich_foreman"); // trusted foreman

        foreach (var foreman in foremen)
        {
            // Petrovitch is less likely to steal if he's the only foreman (reputation mechanic)
            var chanceMultiplier = foreman.WorkerId == "petrovich_foreman" ? 0.5f : 1f;
            if (hasCrm) chanceMultiplier *= (1f - CRM_THEFT_REDUCTION);
            if (hasAccountant) chanceMultiplier *= (1f - ACCOUNTANT_THEFT_REDUCTION);

            var chance = BASE_THEFT_CHANCE_PER_DAY * chanceMultiplier;
            if (Random.value > chance) continue;

            var project = state.CurrentProject;
            var stolenAmount = (long)(project.ContractValue * Random.Range(0.01f, 0.04f));
            stolenAmount = Mathf.Max(5000, stolenAmount); // minimum steal

            // Theft happens silently — money disappears as "materials expense"
            state.Money -= stolenAmount;
            foreman.TotalStolenAmount += stolenAmount;

            // Spawn an event so player can investigate
            SpawnTheftEvent(foreman, stolenAmount, state);
        }
    }

    private void SpawnTheftEvent(HiredWorkerState foreman, long amount, GameState state)
    {
        if (state.ActiveEvents.Count >= 3) return; // don't spam

        var catchChance = state.PurchasedUpgrades.Contains("accountant") ? 0.7f : 0.4f;

        var ev = new ActiveEventState
        {
            EventId = "foreman_theft",
            InstanceId = System.Guid.NewGuid().ToString("N")[..8],
            Title = $"{foreman.Name} «потерял» деньги на материалах",
            Description = $"Накладные на {amount:N0} ₽ есть, а материалов нет. {foreman.Name} говорит: «Поставщик подвёл». Верить?",
            Emoji = "💼",
            TicksLeft = 120,
            AutoResolveOptionIndex = 0, // ignore by default
            IsUrgent = false,
            Options = new()
            {
                new EventOptionState
                {
                    Label = "Поверить. Бывает.",
                    Cost = 0,
                    StressDelta = 5,
                    ReputationDelta = 0,
                    ClientMoodDelta = 0,
                    Outcome = $"{foreman.Name} благодарен. И больше не боится.",
                },
                new EventOptionState
                {
                    Label = $"Проверить накладные ({(int)(catchChance * 100)}% поймать)",
                    Cost = 0,
                    StressDelta = -5, // relief if caught
                    ReputationDelta = 5,
                    ClientMoodDelta = 0,
                    Outcome = Random.value < catchChance
                        ? $"Поймали! {foreman.Name} вернул {(long)(amount * 0.7f):N0} ₽ и уволен."
                        : $"Накладные в порядке. Наверное. {foreman.Name} смотрит невинно.",
                },
                new EventOptionState
                {
                    Label = "Уволить немедленно",
                    Cost = 0,
                    StressDelta = 10,
                    ReputationDelta = -3, // теряем прораба, темп падает
                    ClientMoodDelta = -5,
                    Outcome = $"{foreman.Name} уволен. Объект без прораба — темп упадёт.",
                },
            },
        };

        // If player catches, actually recover money and fire
        // The "outcome" text is baked into the event, but for the "audit" option
        // we need to handle the actual money recovery in the resolve handler
        state.ActiveEvents.Add(ev);
        GameManager.Instance.AddLog($"🤨 Расхождение в накладных на {amount:N0} ₽. {foreman.Name} объясняет...");
    }

    /// <summary>
    /// Called by EventSystem when theft event resolves with "audit" option.
    /// </summary>
    public void HandleTheftAuditResult(string foremanId, long stolenAmount, bool caught, GameState state)
    {
        if (caught)
        {
            var recovered = (long)(stolenAmount * 0.7f);
            state.Money += recovered;
            GameManager.Instance.Workers.Fire(foremanId, state);
            state.Reputation = Mathf.Min(100, state.Reputation + 5);
            GameManager.Instance.AddLog($"💰 Вернули {recovered:N0} ₽. {foremanId} уволен с позором.");
            AnalyticsManager.Track("foreman_caught_stealing", ("foreman", foremanId), ("amount", stolenAmount));
        }
        else
        {
            GameManager.Instance.AddLog("🤷 Не смогли доказать. Работает дальше.");
        }
    }
}
