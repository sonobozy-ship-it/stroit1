using System;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// Battle Pass — weekly season with 50 levels, free + premium track.
/// XP earned from: completing projects, resolving events, hiring workers, doc submissions.
/// Reset weekly on server time (locally: every 7 real days).
/// </summary>
public class BattlePassSystem : MonoBehaviour
{
    public static BattlePassSystem Instance { get; private set; }

    private const int MAX_LEVEL = 50;
    private const int XP_PER_LEVEL = 100;
    private const int SEASON_DAYS = 7;

    void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
    }

    void OnEnable()
    {
        GameManager.OnDayChanged += CheckSeasonReset;
        GameManager.OnStateChanged += OnStateChanged;
    }

    void OnDisable()
    {
        GameManager.OnDayChanged -= CheckSeasonReset;
        GameManager.OnStateChanged -= OnStateChanged;
    }

    private void OnStateChanged(GameState state)
    {
        if (state.BattlePass.WeekStartDay == 0)
            state.BattlePass.WeekStartDay = state.Day;
    }

    private void CheckSeasonReset()
    {
        var state = GameManager.Instance.State;
        var bp = state.BattlePass;
        if (state.Day >= bp.WeekStartDay + SEASON_DAYS)
            StartNewSeason(state);
    }

    // ─────────────────────────────────────────────────────────
    // XP

    public void AddXp(int amount, GameState state)
    {
        var bp = state.BattlePass;
        if (bp.Level >= MAX_LEVEL) return;

        var liveOpsMod = LiveOpsService.Instance?.CurrentEvent?.BattlePassXpMod ?? 1f;
        var finalAmount = Mathf.RoundToInt(amount * liveOpsMod);
        var prevLevel = bp.Level;

        bp.Xp += finalAmount;

        while (bp.Xp >= XP_PER_LEVEL && bp.Level < MAX_LEVEL)
        {
            bp.Xp -= XP_PER_LEVEL;
            bp.Level++;
        }

        if (bp.Level > prevLevel)
            GameManager.Instance.AddLog($"🏆 Боевой пропуск: уровень {bp.Level}! Забирай награду.");
    }

    // XP sources — call these from the relevant systems
    public void OnProjectCompleted(GameState state, float clientMood) =>
        AddXp(clientMood >= 70 ? 30 : clientMood >= 50 ? 20 : 10, state);

    public void OnEventResolved(GameState state) => AddXp(5, state);

    public void OnDocumentAccepted(GameState state, int rejections) =>
        AddXp(rejections == 0 ? 15 : rejections == 1 ? 10 : 5, state);

    public void OnWorkerHired(GameState state) => AddXp(3, state);

    public void OnLoanRepaid(GameState state) => AddXp(8, state);

    // ─────────────────────────────────────────────────────────
    // Rewards

    public BattlePassReward GetReward(int level, bool premium) =>
        premium ? PREMIUM_REWARDS.GetValueOrDefault(level) : FREE_REWARDS.GetValueOrDefault(level);

    public bool ClaimFreeReward(int level, GameState state)
    {
        var bp = state.BattlePass;
        if (bp.Level < level || bp.ClaimedFreeRewards.Contains(level)) return false;

        var reward = FREE_REWARDS.GetValueOrDefault(level);
        if (reward == null) return false;

        ApplyReward(reward, state);
        bp.ClaimedFreeRewards.Add(level);
        GameManager.Instance.AddLog($"🎁 Награда БП уровень {level}: {reward.Description}");
        return true;
    }

    public bool ClaimPremiumReward(int level, GameState state)
    {
        var bp = state.BattlePass;
        if (!bp.IsPremium || bp.Level < level || bp.ClaimedPremiumRewards.Contains(level)) return false;

        var reward = PREMIUM_REWARDS.GetValueOrDefault(level);
        if (reward == null) return false;

        ApplyReward(reward, state);
        bp.ClaimedPremiumRewards.Add(level);
        GameManager.Instance.AddLog($"⭐ Премиум-награда уровень {level}: {reward.Description}");
        return true;
    }

    private void ApplyReward(BattlePassReward reward, GameState state)
    {
        state.Money += reward.Money;
        state.Connections += reward.Connections;
        if (!string.IsNullOrEmpty(reward.WorkerId))
            state.UnlockedWorkerIds.Add(reward.WorkerId);
        if (!string.IsNullOrEmpty(reward.ContractId))
            state.UnlockedContractIds.Add(reward.ContractId);
        AnalyticsManager.Track("battlepass_reward_claimed", ("level", reward.Level), ("premium", reward.IsPremium));
    }

    public void UnlockPremium(GameState state)
    {
        state.BattlePass.IsPremium = true;
        GameManager.Instance.AddLog("⭐ Боевой пропуск активирован. Все премиум-награды разблокированы.");
        AnalyticsManager.TrackIAPPurchase("battle_pass_season", 2.99f);
    }

    // ─────────────────────────────────────────────────────────
    // Weekly tasks

    private void StartNewSeason(GameState state)
    {
        var bp = state.BattlePass;
        bp.Season++;
        bp.Xp = 0;
        bp.Level = 0;
        bp.IsPremium = false;
        bp.ClaimedFreeRewards.Clear();
        bp.ClaimedPremiumRewards.Clear();
        bp.WeeklyTasks = GenerateWeeklyTasks(bp.Season);
        bp.WeekStartDay = state.Day;
        GameManager.Instance.AddLog($"📅 Новый сезон боевого пропуска #{bp.Season}. Новые задачи!");
    }

    private List<WeeklyTask> GenerateWeeklyTasks(int season) => new()
    {
        new() { Id = "complete_projects", Description = "Закрыть 3 объекта", TargetCount = 3, XpReward = 50 },
        new() { Id = "resolve_events",    Description = "Разрешить 10 событий", TargetCount = 10, XpReward = 30 },
        new() { Id = "submit_docs",       Description = "Сдать ИД 5 раз", TargetCount = 5, XpReward = 40 },
        new() { Id = "hire_workers",      Description = "Нанять 2 рабочих", TargetCount = 2, XpReward = 20 },
        new() { Id = "survive_days",      Description = "Продержаться 7 дней без банкротства", TargetCount = 7, XpReward = 60 },
    };

    public void ProgressTask(string taskId, GameState state, int amount = 1)
    {
        var task = state.BattlePass.WeeklyTasks?.Find(t => t.Id == taskId);
        if (task == null || task.IsCompleted) return;

        task.CurrentCount = Mathf.Min(task.TargetCount, task.CurrentCount + amount);
        if (task.IsCompleted)
        {
            AddXp(task.XpReward, state);
            GameManager.Instance.AddLog($"✅ Задача выполнена: {task.Description} (+{task.XpReward} XP)");
        }
    }

    // ─────────────────────────────────────────────────────────
    // Reward tables

    private static readonly Dictionary<int, BattlePassReward> FREE_REWARDS = new()
    {
        [1]  = new() { Level = 1,  Money = 10_000,     Description = "+10 000 ₽" },
        [5]  = new() { Level = 5,  Connections = 10,   Description = "+10 Связей" },
        [10] = new() { Level = 10, Money = 50_000,     Description = "+50 000 ₽" },
        [15] = new() { Level = 15, Connections = 25,   Description = "+25 Связей" },
        [20] = new() { Level = 20, WorkerId = "akhmed",Description = "Ахмед разблокирован" },
        [25] = new() { Level = 25, Money = 150_000,    Description = "+150 000 ₽" },
        [30] = new() { Level = 30, Connections = 50,   Description = "+50 Связей" },
        [40] = new() { Level = 40, Money = 300_000,    Description = "+300 000 ₽" },
        [50] = new() { Level = 50, ContractId = "goszakaz_premium", Connections = 100, Description = "Госконтракт + 100 Связей" },
    };

    private static readonly Dictionary<int, BattlePassReward> PREMIUM_REWARDS = new()
    {
        [1]  = new() { Level = 1,  IsPremium = true, Connections = 20,   Description = "+20 Связей" },
        [5]  = new() { Level = 5,  IsPremium = true, Money = 30_000,     Description = "+30 000 ₽" },
        [10] = new() { Level = 10, IsPremium = true, WorkerId = "kolya_welder", Description = "Коля-Сварщик разблокирован" },
        [15] = new() { Level = 15, IsPremium = true, Connections = 50,   Description = "+50 Связей" },
        [20] = new() { Level = 20, IsPremium = true, Money = 200_000,    Description = "+200 000 ₽" },
        [25] = new() { Level = 25, IsPremium = true, WorkerId = "fedya_electrician", Description = "Дядя Федя разблокирован" },
        [30] = new() { Level = 30, IsPremium = true, Connections = 100,  Description = "+100 Связей" },
        [40] = new() { Level = 40, IsPremium = true, Money = 500_000,    Description = "+500 000 ₽" },
        [50] = new() { Level = 50, IsPremium = true, WorkerId = "sasha_foreman", ContractId = "nightmare_goszakaz", Connections = 200, Description = "Сашок-Прораб + VIP контракт" },
    };
}

[Serializable]
public class BattlePassReward
{
    public int Level;
    public bool IsPremium;
    public long Money;
    public long Connections;
    public string WorkerId;
    public string ContractId;
    public string Description;
}
