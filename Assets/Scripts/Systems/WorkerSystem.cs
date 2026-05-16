using System.Linq;
using UnityEngine;

public class WorkerSystem : MonoBehaviour
{
    [SerializeField] private WorkerDefinition[] _allWorkers;

    public void ProcessTick(GameState state)
    {
        foreach (var w in state.HiredWorkers)
        {
            // Binge recovery
            if (w.IsOnBinge)
            {
                w.BingeTicksLeft--;
                if (w.BingeTicksLeft <= 0)
                {
                    w.IsOnBinge = false;
                    GameManager.Instance.AddLog($"✅ {w.Name} вернулся на объект. Стыдно, но живой.");
                }
                continue;
            }

            // Away on another site recovery
            if (w.IsOnAnotherSite)
            {
                w.AnotherSiteTicksLeft--;
                if (w.AnotherSiteTicksLeft <= 0)
                {
                    w.IsOnAnotherSite = false;
                    GameManager.Instance.AddLog($"👷 {w.Name} вернулся. Говорит, там платили хуже.");
                }
                continue;
            }

            if (state.CurrentProject == null) continue;

            // Random binge
            var drinkChance = w.DrinkRisk * GetForemenDrinkBonus(state);
            if (Random.value < drinkChance)
            {
                w.IsOnBinge = true;
                w.BingeTicksLeft = Random.Range(60, 180);
                state.Stress = Mathf.Min(100, state.Stress + 5);
                GameManager.Instance.AddLog($"🍺 {w.Name} ушёл в запой. Недоступен {w.BingeTicksLeft} сек.");
                continue;
            }

            // Random leave to another site
            if (Random.value < w.LeaveRisk)
            {
                w.IsOnAnotherSite = true;
                w.AnotherSiteTicksLeft = Random.Range(90, 240);
                state.Stress = Mathf.Min(100, state.Stress + 3);
                GameManager.Instance.AddLog($"🏃 {w.Name} уехал на другой объект. Вернётся... наверное.");
            }
        }
    }

    private float GetForemenDrinkBonus(GameState state)
    {
        // Foreman reduces drink risk by 40%
        return state.HiredWorkers.Any(w => w.WorkerId == "petrovich_foreman") ? 0.6f : 1f;
    }

    public void Hire(string workerId, GameState state)
    {
        if (state.HiredWorkers.Any(w => w.WorkerId == workerId)) return;

        var def = GetWorker(workerId);
        if (def == null) return;

        if (state.Money < def.HireCost)
        {
            GameManager.Instance.AddLog($"❌ Не хватает денег на найм {def.WorkerName}.");
            return;
        }

        state.Money -= def.HireCost;
        state.HiredWorkers.Add(new HiredWorkerState
        {
            WorkerId = def.Id,
            Name = def.WorkerName,
            Emoji = def.Emoji,
            Efficiency = def.Efficiency,
            DailyCost = def.DailyCost,
            DrinkRisk = def.DrinkRisk,
            LeaveRisk = def.LeaveRisk,
            Quality = def.Quality,
            Reliability = def.Reliability,
        });

        AnalyticsManager.Track("worker_hired", ("id", workerId), ("cost", def.HireCost));
        GameManager.Instance.AddLog($"✅ {def.WorkerName} ({def.Role}) принят на работу. Дневная ставка: {def.DailyCost:N0} ₽.");
    }

    public void Fire(string workerId, GameState state)
    {
        var w = state.HiredWorkers.FirstOrDefault(x => x.WorkerId == workerId);
        if (w == null) return;

        state.HiredWorkers.Remove(w);
        GameManager.Instance.AddLog($"👋 {w.Name} уволен. Смотрит с укором.");
    }

    public WorkerDefinition GetWorker(string id) =>
        System.Array.Find(_allWorkers, w => w.Id == id);

    public WorkerDefinition[] GetAllWorkers() => _allWorkers;

    public WorkerDefinition[] GetAvailableToHire(GameState state)
    {
        var hiredIds = state.HiredWorkers.Select(w => w.WorkerId).ToHashSet();
        return System.Array.FindAll(_allWorkers, w =>
            !hiredIds.Contains(w.Id) &&
            state.UnlockedWorkerIds.Contains(w.Id) &&
            w.RequiredCompanyLevel <= state.CompanyLevel &&
            w.RequiredReputation <= state.Reputation);
    }

    public float GetTotalEfficiency(GameState state) =>
        state.HiredWorkers
            .Where(w => !w.IsOnBinge && !w.IsOnAnotherSite)
            .Sum(w => w.Efficiency);
}
