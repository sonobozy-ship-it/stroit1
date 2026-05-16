using UnityEngine;

/// <summary>
/// Fetches balance values from Firebase Remote Config.
/// Falls back to hardcoded defaults — game runs fully offline.
/// All game systems read balance via RemoteConfigService, never hardcode values.
///
/// How to use:
///   var chance = RemoteConfigService.EventChancePerTick;
///   var delay  = RemoteConfigService.GoszakazPaymentDelayMin;
///
/// To change balance without app update: edit Firebase Remote Config console.
/// </summary>
public static class RemoteConfigService
{
    private static bool _fetched = false;

    // ─────────────────────────────────────────────────────────
    // Economy

    public static int StartingMoney        => GetInt("starting_money",          50_000);
    public static float AdvancePercent     => GetFloat("advance_percent",        0.25f);
    public static float GoszakazAdvance    => GetFloat("goszakaz_advance",       0.15f);

    // ─────────────────────────────────────────────────────────
    // Payment delays (in ticks / seconds)

    public static int NormalPaymentMin     => GetInt("normal_payment_min",       30);
    public static int NormalPaymentMax     => GetInt("normal_payment_max",       90);
    public static int ToxicPaymentMin      => GetInt("toxic_payment_min",        120);
    public static int ToxicPaymentMax      => GetInt("toxic_payment_max",        300);
    public static int GenpodradPaymentMin  => GetInt("genpodryad_payment_min",   180);
    public static int GenpodradPaymentMax  => GetInt("genpodryad_payment_max",   600);
    public static int GoszakazPaymentMin   => GetInt("goszakaz_payment_min",     600);
    public static int GoszakazPaymentMax   => GetInt("goszakaz_payment_max",     3600);

    // ─────────────────────────────────────────────────────────
    // Payment uncertainty

    public static float NormalPaymentFullChance        => GetFloat("normal_payment_full",   0.65f);
    public static float NormalPaymentPartialChance     => GetFloat("normal_payment_partial", 0.20f);
    public static float NormalPaymentDelayedChance     => GetFloat("normal_payment_delayed", 0.10f);
    // remainder = disappeared

    public static float ToxicPaymentFullChance         => GetFloat("toxic_payment_full",    0.35f);
    public static float ToxicPaymentDisappearedChance  => GetFloat("toxic_payment_gone",    0.15f);

    // ─────────────────────────────────────────────────────────
    // Events

    public static float EventBaseChancePerTick         => GetFloat("event_base_chance",     0.005f);
    public static int   MaxActiveEvents                => GetInt("max_active_events",        3);
    public static int   EventAutoResolveMinTicks       => GetInt("event_autoresolve_min",    45);

    // ─────────────────────────────────────────────────────────
    // Workers

    public static float ForemanDrinkRiskReduction      => GetFloat("foreman_drink_reduction", 0.4f);
    public static int   BingeDurationMinTicks          => GetInt("binge_min_ticks",           60);
    public static int   BingeDurationMaxTicks          => GetInt("binge_max_ticks",           180);

    // ─────────────────────────────────────────────────────────
    // Progression

    public static int   CompanyLevelThreshold2         => GetInt("level_threshold_2",        2);
    public static int   CompanyLevelThreshold3         => GetInt("level_threshold_3",        5);
    public static int   CompanyLevelThreshold4         => GetInt("level_threshold_4",        10);
    public static int   CompanyLevelThreshold5         => GetInt("level_threshold_5",        20);

    // ─────────────────────────────────────────────────────────
    // Ads

    public static int   RewardedAdPaymentReduction     => GetInt("rewarded_payment_reduction", 1800);
    public static int   ConnectionsPaymentReduction    => GetInt("connections_payment_reduction", 600);

    // ─────────────────────────────────────────────────────────
    // Battle Pass

    public static float BattlePassXpPerProject         => GetFloat("bp_xp_per_project",     20f);
    public static float BattlePassPremiumPrice         => GetFloat("bp_premium_price_usd",   2.99f);

    // ─────────────────────────────────────────────────────────
    // Stress

    public static float StressDeadlinePerTick          => GetFloat("stress_deadline_per_tick", 0.5f);
    public static float StressOverduePerTick            => GetFloat("stress_overdue_per_tick",  1.0f);
    public static float StressRecoveryPerTick           => GetFloat("stress_recovery_per_tick", 0.05f);

    // ─────────────────────────────────────────────────────────
    // Fetch from Firebase (call on app start)

    public static void Fetch()
    {
        // TODO: Firebase.RemoteConfig.FirebaseRemoteConfig.DefaultInstance
        //       .FetchAndActivateAsync()
        //       .ContinueWithOnMainThread(task => { _fetched = true; });
        Debug.Log("[RemoteConfig] Fetch called (stub — using defaults).");
        _fetched = true;
    }

    // ─────────────────────────────────────────────────────────
    private static int GetInt(string key, int fallback)
    {
        if (!_fetched) return fallback;
        // TODO: return (int)Firebase.RemoteConfig.FirebaseRemoteConfig
        //           .DefaultInstance.GetValue(key).LongValue;
        return fallback;
    }

    private static float GetFloat(string key, float fallback)
    {
        if (!_fetched) return fallback;
        // TODO: return (float)Firebase.RemoteConfig.FirebaseRemoteConfig
        //           .DefaultInstance.GetValue(key).DoubleValue;
        return fallback;
    }

    private static bool GetBool(string key, bool fallback)
    {
        if (!_fetched) return fallback;
        // TODO: return Firebase.RemoteConfig.FirebaseRemoteConfig
        //           .DefaultInstance.GetValue(key).BooleanValue;
        return fallback;
    }
}
