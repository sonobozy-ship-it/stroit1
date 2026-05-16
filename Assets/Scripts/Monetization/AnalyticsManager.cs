using System;
using UnityEngine;

/// <summary>
/// Thin wrapper over Firebase Analytics + GameAnalytics.
/// All tracking calls go through here.
/// </summary>
public static class AnalyticsManager
{
    private static bool _initialized = false;

    public static void Initialize()
    {
        // TODO: FirebaseApp.InitializeApp(), GameAnalytics.Initialize()
        _initialized = true;
        Debug.Log("[Analytics] Initialized (stub).");
    }

    // Core tracking method with variadic params
    public static void Track(string eventName, params (string key, object value)[] parameters)
    {
        if (!_initialized) return;

#if UNITY_EDITOR
        var paramStr = string.Join(", ", System.Array.ConvertAll(parameters, p => $"{p.key}={p.value}"));
        Debug.Log($"[Analytics] {eventName} {{ {paramStr} }}");
#endif

        // TODO: Forward to Firebase Analytics
        // var bundle = new Dictionary<string, object>();
        // foreach (var (key, value) in parameters) bundle[key] = value;
        // FirebaseAnalytics.LogEvent(eventName, bundle);

        // TODO: Forward to GameAnalytics
        // GameAnalytics.NewDesignEvent($"game:{eventName}");
    }

    // ──────────────────────────────────────────────
    // Predefined events — keeps tracking consistent

    public static void TrackSessionStart(int day, int completedProjects)
        => Track("session_start", ("day", day), ("completed_projects", completedProjects));

    public static void TrackSessionEnd(float sessionLengthSeconds, int day)
        => Track("session_end", ("length_sec", sessionLengthSeconds), ("day", day));

    public static void TrackFirstLaunch()
        => Track("first_launch");

    public static void TrackContractStarted(string contractId, long value)
        => Track("contract_started", ("id", contractId), ("value", value));

    public static void TrackContractCompleted(string contractId, long earned, float clientMood, int docRejections)
        => Track("contract_completed",
            ("id", contractId),
            ("earned", earned),
            ("client_mood", clientMood),
            ("doc_rejections", docRejections));

    public static void TrackContractFailed(string contractId, string reason)
        => Track("contract_failed", ("id", contractId), ("reason", reason));

    public static void TrackWorkerHired(string workerId, long cost)
        => Track("worker_hired", ("id", workerId), ("cost", cost));

    public static void TrackEventSpawned(string eventId, int activeCount)
        => Track("event_spawned", ("id", eventId), ("active_count", activeCount));

    public static void TrackEventResolved(string eventId, int optionIndex, bool wasAuto)
        => Track("event_resolved", ("id", eventId), ("option", optionIndex), ("auto", wasAuto));

    public static void TrackPaymentReceived(string client, long amount, int waitTicks)
        => Track("payment_received", ("client", client), ("amount", amount), ("wait_ticks", waitTicks));

    public static void TrackCompanyLevelUp(int newLevel)
        => Track("company_level_up", ("level", newLevel));

    public static void TrackUpgradePurchased(string upgradeId, long cost)
        => Track("upgrade_purchased", ("id", upgradeId), ("cost", cost));

    public static void TrackStressGameOver(int day, int completedProjects, long totalEarned)
        => Track("game_over_stress",
            ("day", day),
            ("completed", completedProjects),
            ("earned", totalEarned));

    public static void TrackDocumentSubmit(string projectId, int rejectionNumber, bool accepted)
        => Track("document_submit",
            ("project", projectId),
            ("rejection_num", rejectionNumber),
            ("accepted", accepted));

    // Monetization
    public static void TrackRewardedAdShown(string context)
        => Track("rewarded_ad_shown", ("context", context));

    public static void TrackRewardedAdCompleted(string context)
        => Track("rewarded_ad_completed", ("context", context));

    public static void TrackInterstitialShown(int sessionCount)
        => Track("interstitial_shown", ("session_count", sessionCount));

    public static void TrackIAPPurchase(string productId, float priceUsd)
        => Track("iap_purchase", ("product", productId), ("price_usd", priceUsd));

    public static void TrackIAPInitiated(string productId, string triggerContext)
        => Track("iap_initiated", ("product", productId), ("context", triggerContext));
}
