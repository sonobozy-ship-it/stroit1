using UnityEngine;

[CreateAssetMenu(menuName = "Stroyka/Worker Definition")]
public class WorkerDefinition : ScriptableObject
{
    [Header("Identity")]
    public string Id;
    public string WorkerName;
    public string Role;
    public string Emoji;
    public string Description;
    public string QuirkText; // "Периодически пьёт"

    [Header("Stats (0–1)")]
    [Range(1, 10)] public float Efficiency = 3;  // idle progress per tick
    [Range(0, 1)] public float Quality = 0.5f;    // reduces rework chance
    [Range(0, 1)] public float Reliability = 0.5f;// reduces event chance

    [Header("Economy")]
    public long HireCost = 0;
    public long DailyCost = 3000;

    [Header("Risk")]
    [Range(0, 0.02f)] public float DrinkRisk = 0.005f;     // per-tick binge chance
    [Range(0, 0.01f)] public float LeaveRisk = 0.002f;     // leaves for another site

    [Header("Unlock")]
    public int RequiredCompanyLevel = 1;
    public string[] RequiredUpgrades;
    public float RequiredReputation = 0;

    [Header("Special")]
    public WorkerSpecialization Specialization;
    // ПТО-специалист снижает DocumentIterations, Прораб снижает DrinkRisk команды, etc.
}

public enum WorkerSpecialization
{
    General,
    Electrician,
    Welder,
    Finisher,
    Foreman,       // Прораб — боффы для команды
    Procurement,   // Снабженец
    DocumentsSpec, // ПТО-специалист
    Lawyer,        // Снижает штрафы
}
