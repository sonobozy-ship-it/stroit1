using UnityEngine;

[CreateAssetMenu(menuName = "Stroyka/Game Event Definition")]
public class GameEventDefinition : ScriptableObject
{
    [Header("Identity")]
    public string Id;
    public string Title;
    [TextArea(2, 4)] public string Description;
    public string Emoji;

    [Header("Trigger")]
    public EventCategory Category;
    [Range(0f, 1f)] public float BaseChancePerTick = 0.003f;
    public bool RequiresActiveProject = true;
    public bool IsUrgent = false;

    [Header("Timing")]
    public int AutoResolveAfterTicks = 90;  // how long player has to decide
    public int AutoResolveOptionIndex = 0;   // which option triggers on timeout

    [Header("Options")]
    public GameEventOption[] Options;

    [Header("LiveOps")]
    public bool IsLiveOpsEvent = false;  // only spawned during specific weekly events
}

public enum EventCategory
{
    Workers,     // Бригада
    Client,      // Заказчик
    Documents,   // ПТО/ИД
    External,    // Ростехнадзор, погода
    Finance,     // Кассовый разрыв, субподрядчики
    Inspection,  // Проверки (пожарка, налоговая)
}

[System.Serializable]
public class GameEventOption
{
    public string Label;
    public long Cost;                // >0 player pays, <0 player earns
    [Range(-30, 0)] public float ProgressPenalty;
    [Range(-20, 30)] public float StressDelta;
    [Range(-20, 15)] public float ReputationDelta;
    [Range(-30, 20)] public float ClientMoodDelta;
    public long ConnectionsCost;
    public bool RequiresRewardedAd;
    [TextArea(1, 3)] public string Outcome;
}
