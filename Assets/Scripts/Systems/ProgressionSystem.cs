using UnityEngine;

public class ProgressionSystem : MonoBehaviour
{
    [SerializeField] private UpgradeDefinition[] _allUpgrades;

    public void CheckUnlocks(GameState state)
    {
        var count = state.CompletedProjects.Count;

        // Level up company
        var newLevel = count switch
        {
            >= 20 => 5,
            >= 10 => 4,
            >= 5  => 3,
            >= 2  => 2,
            _     => 1,
        };

        if (newLevel > state.CompanyLevel)
        {
            state.CompanyLevel = newLevel;
            var levelNames = new[] { "", "ИП", "Бригада", "Компания", "Генподряд", "Империя" };
            GameManager.Instance.AddLog($"🏆 Уровень компании: {levelNames[newLevel]}! Открыты новые контракты.");
            AnalyticsManager.Track("company_level_up", ("level", newLevel));
        }

        // Unlock content based on completed projects
        UnlockByProjectCount(state, count);
    }

    private void UnlockByProjectCount(GameState state, int count)
    {
        if (count >= 1) state.UnlockedWorkerIds.Add("akhmed");
        if (count >= 2) state.UnlockedContractIds.Add("ofis_small");
        if (count >= 2) state.UnlockedWorkerIds.Add("kolya_welder");
        if (count >= 3) state.UnlockedWorkerIds.Add("fedya_electrician");
        if (count >= 4) state.UnlockedContractIds.Add("magazin");
        if (count >= 5) state.UnlockedWorkerIds.Add("petrovich_foreman");
        if (count >= 5) state.UnlockedContractIds.Add("sklad");
        if (count >= 7) state.UnlockedWorkerIds.Add("sasha_foreman");
        if (count >= 10) state.UnlockedContractIds.Add("tc_3_floor");
        if (count >= 10) state.UnlockedContractIds.Add("goszakaz_school");
        if (count >= 15) state.UnlockedWorkerIds.Add("doc_specialist");
        if (count >= 20) state.UnlockedContractIds.Add("goszakaz_hospital");
    }

    public void PurchaseUpgrade(string upgradeId, GameState state)
    {
        var def = GetUpgrade(upgradeId);
        if (def == null) return;

        if (state.PurchasedUpgrades.Contains(upgradeId))
        {
            GameManager.Instance.AddLog("❌ Апгрейд уже куплен.");
            return;
        }

        if (state.Money < def.MoneyCost || state.Connections < def.ConnectionsCost)
        {
            GameManager.Instance.AddLog("❌ Недостаточно ресурсов для апгрейда.");
            return;
        }

        state.Money -= def.MoneyCost;
        state.Connections -= def.ConnectionsCost;
        state.PurchasedUpgrades.Add(upgradeId);

        // Apply unlock effects
        foreach (var c in def.UnlocksContracts) state.UnlockedContractIds.Add(c);
        foreach (var w in def.UnlocksWorkers) state.UnlockedWorkerIds.Add(w);

        GameManager.Instance.AddLog($"✅ Апгрейд: {def.UpgradeName}. {def.Description}");
        AnalyticsManager.Track("upgrade_purchased", ("id", upgradeId), ("cost", def.MoneyCost));
    }

    public void SpendConnections(string purpose, GameState state)
    {
        const long cost = 10;
        if (state.Connections < cost)
        {
            GameManager.Instance.AddLog("❌ Недостаточно Связей.");
            return;
        }

        state.Connections -= cost;
        GameManager.Instance.AddLog($"🤝 Связи задействованы: {purpose}.");
    }

    public void AddConnections(long amount, GameState state)
    {
        state.Connections += amount;
        GameManager.Instance.AddLog($"🤝 +{amount} Связей.");
    }

    public UpgradeDefinition GetUpgrade(string id) =>
        System.Array.Find(_allUpgrades, u => u.Id == id);

    public UpgradeDefinition[] GetAvailable(GameState state) =>
        System.Array.FindAll(_allUpgrades, u =>
            !state.PurchasedUpgrades.Contains(u.Id) &&
            u.RequiredCompanyLevel <= state.CompanyLevel &&
            u.RequiredReputation <= state.Reputation &&
            System.Array.TrueForAll(u.RequiredUpgrades ?? new string[0], r => state.PurchasedUpgrades.Contains(r)));
}
