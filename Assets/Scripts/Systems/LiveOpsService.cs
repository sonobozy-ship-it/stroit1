using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Weekly global events. Determined by UTC week number — no server needed.
/// Every player on the same calendar week sees the same event.
/// Server-driven rotation added later via RemoteConfigService.
/// </summary>
public class LiveOpsService : MonoBehaviour
{
    public static LiveOpsService Instance { get; private set; }

    public LiveOpsEvent CurrentEvent { get; private set; }

    private int _lastCheckedWeek = -1;

    void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    void Start() => CheckWeeklyEvent();

    void OnEnable() => GameManager.OnDayChanged += OnDayChanged;
    void OnDisable() => GameManager.OnDayChanged -= OnDayChanged;

    private void OnDayChanged() => CheckWeeklyEvent();

    private void CheckWeeklyEvent()
    {
        var week = GetIso8601WeekNumber(DateTime.UtcNow);
        if (week == _lastCheckedWeek) return;

        _lastCheckedWeek = week;
        var prev = CurrentEvent;
        CurrentEvent = SelectEvent(week);

        if (prev?.Id != CurrentEvent.Id)
        {
            GameManager.Instance.AddLog($"📢 Новый еженедельный ивент: {CurrentEvent.Emoji} {CurrentEvent.Name}. {CurrentEvent.Description}");
            AnalyticsManager.Track("live_ops_event_started", ("id", CurrentEvent.Id), ("week", week));
        }
    }

    private static LiveOpsEvent SelectEvent(int week)
    {
        var index = week % ALL_EVENTS.Count;
        return ALL_EVENTS[index];
    }

    // Applies this week's modifiers to a new project
    public void ApplyToProject(ProjectState project)
    {
        if (CurrentEvent == null) return;
        project.EventMultiplier *= CurrentEvent.EventMultiplierMod;
    }

    // Material cost modifier (checked in FinanceSystem)
    public float GetMaterialCostMod() => CurrentEvent?.MaterialCostMod ?? 1f;

    // Worker salary modifier
    public float GetWorkerCostMod() => CurrentEvent?.WorkerCostMod ?? 1f;

    // ─────────────────────────────────────────────────────────
    private static int GetIso8601WeekNumber(DateTime date)
    {
        var day = (int)System.Globalization.CultureInfo.InvariantCulture
            .Calendar.GetDayOfWeek(date);
        return System.Globalization.CultureInfo.InvariantCulture
            .Calendar.GetWeekOfYear(date.AddDays(4 - (day == 0 ? 7 : day)),
                System.Globalization.CalendarWeekRule.FirstFourDayWeek,
                DayOfWeek.Monday);
    }

    // ─────────────────────────────────────────────────────────
    private static readonly List<LiveOpsEvent> ALL_EVENTS = new()
    {
        new()
        {
            Id = "metal_spike",
            Name = "Скачок цен на металл",
            Emoji = "📈",
            Description = "Металлопрокат подорожал на 40%. Пересматривайте сметы.",
            MaterialCostMod = 1.40f,
            EventMultiplierMod = 1.1f,
            WorkerCostMod = 1f,
            BattlePassXpMod = 1.2f,
        },
        new()
        {
            Id = "inspection_season",
            Name = "Сезон проверок",
            Emoji = "🔍",
            Description = "Ростехнадзор активизировался. Вероятность проверок +60%.",
            MaterialCostMod = 1f,
            EventMultiplierMod = 1.6f,
            WorkerCostMod = 1f,
            BattlePassXpMod = 1.3f,
        },
        new()
        {
            Id = "goszakaz_season",
            Name = "Сезон госзаказов",
            Emoji = "🏛️",
            Description = "Открыты госконтракты с повышенным авансом. Казначейство немного шевелится.",
            MaterialCostMod = 1f,
            EventMultiplierMod = 0.9f,
            WorkerCostMod = 1f,
            GoszakazAdvanceBonus = 0.05f,
            BattlePassXpMod = 1.5f,
        },
        new()
        {
            Id = "winter_build",
            Name = "Зимняя стройка",
            Emoji = "❄️",
            Description = "Мороз. Бетонировать нельзя. Скорость строительства −25%.",
            MaterialCostMod = 1.15f,
            EventMultiplierMod = 1.2f,
            WorkerCostMod = 1.1f,
            BuildSpeedMod = 0.75f,
            BattlePassXpMod = 1.4f,
        },
        new()
        {
            Id = "dollar_rate",
            Name = "Курс доллара вырос",
            Emoji = "💵",
            Description = "Импортные материалы подорожали. Рублёвые сметы не сходятся.",
            MaterialCostMod = 1.25f,
            EventMultiplierMod = 1.15f,
            WorkerCostMod = 1f,
            BattlePassXpMod = 1.2f,
        },
        new()
        {
            Id = "labor_shortage",
            Name = "Дефицит рабочей силы",
            Emoji = "👷",
            Description = "Все рабочие разобраны конкурентами. Зарплаты выросли.",
            MaterialCostMod = 1f,
            EventMultiplierMod = 1.3f,
            WorkerCostMod = 1.35f,
            BattlePassXpMod = 1.25f,
        },
        new()
        {
            Id = "pto_amnesty",
            Name = "Амнистия ПТО",
            Emoji = "📋",
            Description = "ПТО в хорошем настроении. Документы принимают со второго раза.",
            MaterialCostMod = 1f,
            EventMultiplierMod = 0.8f,
            WorkerCostMod = 1f,
            DocumentIterationsMod = 0.5f,
            BattlePassXpMod = 1f,
        },
    };
}

[Serializable]
public class LiveOpsEvent
{
    public string Id;
    public string Name;
    public string Emoji;
    public string Description;

    public float MaterialCostMod = 1f;
    public float WorkerCostMod = 1f;
    public float EventMultiplierMod = 1f;
    public float BuildSpeedMod = 1f;
    public float DocumentIterationsMod = 1f;
    public float GoszakazAdvanceBonus = 0f;
    public float BattlePassXpMod = 1f;
}
