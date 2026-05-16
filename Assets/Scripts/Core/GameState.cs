using System;
using System.Collections.Generic;

[Serializable]
public class GameState
{
    // Economy
    public long Money = 50_000;
    public long TotalEarned = 0;
    public long Connections = 0;

    // Meters (0–100)
    public float Stress = 0;
    public float Reputation = 50;

    // Time
    public int Day = 1;
    public int Tick = 0;

    // Projects
    public ProjectState CurrentProject = null;
    public List<CompletedProjectRecord> CompletedProjects = new();

    // Workers
    public List<HiredWorkerState> HiredWorkers = new();

    // Events
    public List<ActiveEventState> ActiveEvents = new();

    // Client relations
    public Dictionary<string, ClientRelation> ClientRelations = new();

    // Active loans
    public List<ActiveLoan> ActiveLoans = new();

    // Progression
    public int CompanyLevel = 1;
    public string CompanyName = "ИП Строй-Мастер";
    public HashSet<string> UnlockedContractIds = new() { "kvartira_ekonom" };
    public HashSet<string> UnlockedWorkerIds = new() { "vasya" };
    public HashSet<string> PurchasedUpgrades = new();

    // Battle Pass
    public BattlePassState BattlePass = new();

    // Log
    public List<LogEntry> Log = new();

    // State
    public bool IsGameOver = false;
    public long TotalDaysPlayed = 0;

    // Pending payments (retention hook)
    public List<PendingPayment> PendingPayments = new();
}

// ─────────────────────────────────────────────────────────
// Project

[Serializable]
public class ProjectState
{
    public string ContractId;
    public string Name;
    public string Client;
    public string ClientId;        // used for ClientRelations lookup
    public string ClientType;
    public string Emoji;

    public long ContractValue;
    public long AdvancePaid;
    public long ExtraRevenue;
    public long AccruedPenalties;

    public float Progress;
    public ProjectPhase Phase = ProjectPhase.Procurement;
    public float PhaseProgress = 0;

    public float ClientMood;
    public int StartDay;
    public int DeadlineDay;
    public float EventMultiplier = 1f;

    // Documents
    public bool DocumentsReady = false;
    public int DocumentRejections = 0;
    public int DocumentMaxIterations = 3;
    public List<string> RejectionReasons = new();

    // Payment
    public bool Ks2Signed = false;
    public PaymentOutcome PaymentOutcomeRolled = PaymentOutcome.Unknown;
    public int OverdueDays = 0;       // days past deadline
    public bool ClientAbandoned = false; // social humiliation flag
}

public enum ProjectPhase
{
    Procurement,
    Construction,
    Finishing,
    Documents,
    SigningKS2,
    WaitingPayment,
    Completed,
}

public enum PaymentOutcome
{
    Unknown,
    Full,           // 100% — клиент доволен
    Partial,        // 50–85% — «нашли нарушения в смете»
    Delayed,        // платит, но сдвигает срок ещё раз (госка)
    Disappeared,    // исчез. Аванс остался, остаток потерян.
}

// ─────────────────────────────────────────────────────────
// Workers

[Serializable]
public class HiredWorkerState
{
    public string WorkerId;
    public string Name;
    public string Emoji;
    public float Efficiency;
    public long DailyCost;
    public float DrinkRisk;
    public float LeaveRisk;
    public float Quality;
    public float Reliability;
    public bool IsForeman;          // высокий DrinkRisk бонус, но может воровать

    public bool IsOnBinge = false;
    public int BingeTicksLeft = 0;
    public bool IsOnAnotherSite = false;
    public int AnotherSiteTicksLeft = 0;

    public long TotalStolenAmount = 0; // статистика — сколько украл
}

// ─────────────────────────────────────────────────────────
// Events

[Serializable]
public class ActiveEventState
{
    public string EventId;
    public string InstanceId;
    public string Title;
    public string Description;
    public string Emoji;
    public int TicksLeft;
    public int AutoResolveOptionIndex;
    public List<EventOptionState> Options = new();
    public bool IsUrgent = false;
}

[Serializable]
public class EventOptionState
{
    public string Label;
    public long Cost;
    public float ProgressPenalty;
    public float StressDelta;
    public float ReputationDelta;
    public float ClientMoodDelta;
    public long ConnectionsCost;
    public bool RequiresRewardedAd;
    public string Outcome;
}

// ─────────────────────────────────────────────────────────
// Payments

[Serializable]
public class PendingPayment
{
    public string ProjectName;
    public string Client;
    public long Amount;
    public int ArrivalTick;
    public int ArrivalTickOriginal;
    public PaymentOutcome Outcome;  // revealed when payment arrives
    public bool OutcomeRevealed = false;
}

// ─────────────────────────────────────────────────────────
// Loans

[Serializable]
public class ActiveLoan
{
    public string Id;
    public string LenderName;
    public LoanType Type;
    public long PrincipalAmount;
    public long TotalOwed;          // principal + interest
    public long DailyInterest;
    public int DueTick;             // when it must be repaid
    public bool IsOverdue = false;
}

public enum LoanType
{
    Bank,           // 15% fee, 7-day repay — manageable
    QuickMoney,     // 40% fee, 3-day repay — painful
    LoanShark,      // 80% fee, 2-day repay — toxic, можно потерять технику
    FriendLoan,     // 0% fee — requires high Connections
}

// ─────────────────────────────────────────────────────────
// Client Relations

[Serializable]
public class ClientRelation
{
    public string ClientId;
    public string ClientName;
    public string ClientType;
    public int ProjectsCompleted = 0;
    public float AverageMoodAtClose = 50;
    public bool IsRegular = false;      // 2+ projects with good mood
    public bool IsBlacklisted = false;  // client abandoned or failed
    public float PaymentSpeedBonus = 0; // seconds reduction per project (stacks)
    public float AdvancePercentBonus = 0;
}

// ─────────────────────────────────────────────────────────
// Battle Pass

[Serializable]
public class BattlePassState
{
    public int Season = 1;
    public int Xp = 0;
    public int Level = 0;           // 0–50
    public bool IsPremium = false;
    public HashSet<int> ClaimedFreeRewards = new();
    public HashSet<int> ClaimedPremiumRewards = new();
    public List<WeeklyTask> WeeklyTasks = new();
    public int WeekStartDay = 0;
}

[Serializable]
public class WeeklyTask
{
    public string Id;
    public string Description;
    public int TargetCount;
    public int CurrentCount;
    public int XpReward;
    public bool IsCompleted => CurrentCount >= TargetCount;
}

// ─────────────────────────────────────────────────────────
// Records

[Serializable]
public class CompletedProjectRecord
{
    public string Name;
    public string Client;
    public string ClientId;
    public string Emoji;
    public long Earned;
    public int CompletedDay;
    public float FinalClientMood;
    public int DocumentRejections;
    public PaymentOutcome Outcome;
}

[Serializable]
public class LogEntry
{
    public string Message;
    public int Tick;
}
