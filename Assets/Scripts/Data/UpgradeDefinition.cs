using UnityEngine;

[CreateAssetMenu(menuName = "Stroyka/Upgrade Definition")]
public class UpgradeDefinition : ScriptableObject
{
    [Header("Identity")]
    public string Id;
    public string UpgradeName;
    public string Emoji;
    [TextArea(1, 3)] public string Description;
    public UpgradeCategory Category;

    [Header("Cost")]
    public long MoneyCost;
    public long ConnectionsCost;

    [Header("Requirements")]
    public int RequiredCompanyLevel = 1;
    public string[] RequiredUpgrades;
    public float RequiredReputation = 0;

    [Header("Effects")]
    // Each upgrade can affect multiple game parameters
    public float EventChanceMultiplier = 1f;         // <1 reduces events
    public float DocumentIterationsMultiplier = 1f;  // <1 reduces ИД iterations
    public float WorkerDrinkRiskMultiplier = 1f;     // <1 reduces binge risk
    public float PenaltyMultiplier = 1f;             // <1 reduces штрафы
    public long DailyPassiveIncome = 0;              // extra money per day
    public int MaxActiveProjects = 1;                // unlocks parallel projects
    public float PaymentSpeedMultiplier = 1f;        // <1 speeds up payment wait
    public float ReputationGainMultiplier = 1f;

    [Header("Unlock")]
    public string[] UnlocksContracts;
    public string[] UnlocksWorkers;
    public bool UnlocksParallelProjects = false;
}

public enum UpgradeCategory
{
    Office,      // Офис, CRM
    Warehouse,   // Склад
    Equipment,   // Техника
    Team,        // Прораб, снабженец, юрист
    Connections, // Связи
    Legal,       // Юридическая защита
}
