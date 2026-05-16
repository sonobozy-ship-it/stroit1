using UnityEngine;

[CreateAssetMenu(menuName = "Stroyka/Contract Definition")]
public class ContractDefinition : ScriptableObject
{
    [Header("Identity")]
    public string Id;
    public string ContractName;
    public string Client;
    public string ClientType; // "normal" | "toxic" | "goszakaz" | "genpodryad"
    public string Emoji;
    public string Description;

    [Header("Economy")]
    public long ContractValue;
    [Range(0.1f, 0.5f)] public float AdvancePercent = 0.3f;
    public long MaterialsCost;       // upfront cost to start
    [Range(0f, 1f)] public float ProfitMargin = 0.25f;

    [Header("Timeline")]
    public int DurationDays;
    [Range(1f, 3f)] public float EventMultiplier = 1f;

    [Header("Difficulty")]
    public ContractDifficulty Difficulty;
    [Range(40, 90)] public int ClientMoodStart = 70;

    [Header("Documents")]
    public int DocumentIterationsMin = 1;
    public int DocumentIterationsMax = 4;

    [Header("Unlock")]
    public int RequiredCompanyLevel = 1;
    public float RequiredReputation = 0f;
    public string[] RequiredUpgrades;

    [Header("Progression")]
    public string[] UnlocksContracts;  // unlocked on completion
    public string[] UnlocksWorkers;
}

public enum ContractDifficulty
{
    Easy,
    Medium,
    Hard,
    Nightmare,
}
