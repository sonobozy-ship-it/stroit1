using System;
using System.Collections;
using UnityEngine;

/// <summary>
/// Central singleton. Owns game state, coordinates all systems, drives tick loop.
/// </summary>
public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }

    [Header("Systems (assign in Inspector)")]
    public ProjectSystem Projects;
    public WorkerSystem Workers;
    public FinanceSystem Finance;
    public EventSystem Events;
    public DocumentSystem Documents;
    public ClientRelationsSystem ClientRelations;
    public ProgressionSystem Progression;
    public BattlePassSystem BattlePass;
    public ForemanTheftSystem ForemanTheft;
    public LiveOpsService LiveOps;

    public GameState State { get; private set; }

    public static event Action<GameState> OnStateChanged;
    public static event Action OnDayChanged;
    public static event Action OnGameOver;

    private const float TICK_INTERVAL_SECONDS = 1f;
    private Coroutine _tickCoroutine;

    // ──────────────────────────────────────────────
    void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
        State = SaveSystem.Load();
    }

    void Start()
    {
        RemoteConfigService.Fetch();
        _tickCoroutine = StartCoroutine(TickLoop());
        InvokeRepeating(nameof(AutoSave), 30f, 30f);
        AnalyticsManager.TrackSessionStart(State.Day, State.CompletedProjects.Count);
    }

    void OnApplicationPause(bool paused)
    {
        if (paused) SaveSystem.Save(State);
    }

    void OnApplicationQuit()
    {
        SaveSystem.Save(State);
    }

    // ──────────────────────────────────────────────
    private IEnumerator TickLoop()
    {
        while (true)
        {
            yield return new WaitForSeconds(TICK_INTERVAL_SECONDS);
            ProcessTick();
        }
    }

    private void ProcessTick()
    {
        if (State.IsGameOver) return;

        var prevDay = State.Day;
        State.Tick++;
        State.Day = State.Tick / 30 + 1; // 30 ticks = 1 game day

        // Fire day-change events (daily costs, etc.)
        if (State.Day != prevDay)
        {
            State.TotalDaysPlayed++;
            OnDayChanged?.Invoke();
            Finance.ProcessDailyCosts(State);
            AnalyticsManager.Track("day_changed", ("day", State.Day));
        }

        // Process pending payments (retention hook)
        Finance.ProcessPendingPayments(State);

        // Worker tick (binge/recovery)
        Workers.ProcessTick(State);

        // Project idle progress
        if (State.CurrentProject != null)
        {
            Projects.ProcessTick(State);
        }

        // Spawn/expire random events
        Events.ProcessTick(State);

        // Check game over conditions
        CheckGameOver();

        OnStateChanged?.Invoke(State);
    }

    private void CheckGameOver()
    {
        if (State.Stress >= 100)
        {
            State.IsGameOver = true;
            AddLog("💀 Нервный срыв. Вы бросили стройку и открыли шаурмячную. Говорят, там лучше.");
            AnalyticsManager.Track("game_over", ("day", State.Day), ("projects", State.CompletedProjects.Count));
            OnGameOver?.Invoke();
        }
    }

    // ──────────────────────────────────────────────
    // Public API — all UI actions go through here

    public void HireWorker(string workerId)
    {
        Workers.Hire(workerId, State);
        Notify();
    }

    public void FireWorker(string workerId)
    {
        Workers.Fire(workerId, State);
        Notify();
    }

    public void TakeContract(string contractId)
    {
        if (State.CurrentProject != null) return;
        Projects.StartProject(contractId, State);
        Notify();
    }

    public void ResolveEvent(string instanceId, int optionIndex, bool usedRewardedAd = false)
    {
        Events.Resolve(instanceId, optionIndex, usedRewardedAd, State);
        Notify();
    }

    public void SubmitDocuments()
    {
        Documents.Submit(State);
        Notify();
    }

    public void SignKS2()
    {
        Projects.SignKS2(State);
        Notify();
    }

    public void UseConnections(string purpose)
    {
        Progression.SpendConnections(purpose, State);
        Notify();
    }

    public void SpeedUpPayment(bool usedRewardedAd)
    {
        Finance.SpeedUpPendingPayment(usedRewardedAd, State);
        Notify();
    }

    // ──────────────────────────────────────────────
    public void AddLog(string message)
    {
        State.Log.Insert(0, new LogEntry { Message = message, Tick = State.Tick });
        if (State.Log.Count > 60) State.Log.RemoveAt(60);
    }

    private void Notify()
    {
        OnStateChanged?.Invoke(State);
        SaveSystem.Save(State);
    }

    private void AutoSave() => SaveSystem.Save(State);
}
