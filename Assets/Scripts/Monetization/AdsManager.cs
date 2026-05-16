using System;
using UnityEngine;

/// <summary>
/// Wrapper over rewarded/interstitial ads.
/// All game code calls AdsManager — never the SDK directly.
/// Swap the SDK implementation without touching game code.
/// </summary>
public class AdsManager : MonoBehaviour
{
    public static AdsManager Instance { get; private set; }

    // Contexts where rewarded ads appear — phrased as in-world actions
    public enum RewardedContext
    {
        CallAccountant,       // Позвонить бухгалтерии → -30 min payment wait
        FindTempWorkers,      // Найти временных рабочих → replaces binge worker
        SpeedUpDelivery,      // Срочная поставка → instant materials
        CallPtoContact,       // Позвонить знакомому в ПТО → accept documents immediately
        GetMicroloan,         // Срочный займ → +100k руб
        ReduceInspectionFine, // Договориться → штраф -50%
        FindCheaperSupplier,  // Нашёл дешевле → material cost -20%
    }

    private bool _rewardedLoaded = false;
    private bool _interstitialLoaded = false;
    private int _sessionInterstitialCount = 0;
    private const int MAX_INTERSTITIAL_PER_SESSION = 3;

    void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
        DontDestroyOnLoad(gameObject);
        InitializeSdk();
    }

    private void InitializeSdk()
    {
        // TODO: Initialize AdMob / IronSource / MAX here
        // Example AdMob: MobileAds.Initialize(initStatus => { LoadRewarded(); LoadInterstitial(); });
        Debug.Log("[AdsManager] SDK initialized (stub).");
        _rewardedLoaded = true;
        _interstitialLoaded = true;
    }

    // ──────────────────────────────────────────────
    // Rewarded Ads

    public bool IsRewardedAvailable() => _rewardedLoaded;

    public void ShowRewarded(RewardedContext context, Action onSuccess, Action onFail = null)
    {
        if (!_rewardedLoaded)
        {
            onFail?.Invoke();
            return;
        }

        AnalyticsManager.Track("rewarded_ad_requested", ("context", context.ToString()));

        // TODO: Show actual rewarded ad here
        // On reward callback:
        SimulateRewardedCallback(context, onSuccess, onFail);
    }

    private void SimulateRewardedCallback(RewardedContext context, Action onSuccess, Action onFail)
    {
        // In real implementation, this callback comes from the ad SDK
        Debug.Log($"[AdsManager] Rewarded ad shown for: {context}");
        _rewardedLoaded = false;
        AnalyticsManager.Track("rewarded_ad_completed", ("context", context.ToString()));
        onSuccess?.Invoke();
        Invoke(nameof(LoadRewarded), 30f); // reload after 30s
    }

    private void LoadRewarded()
    {
        _rewardedLoaded = true;
        // TODO: Load rewarded ad from SDK
    }

    // ──────────────────────────────────────────────
    // Interstitial Ads (shown after project completion)

    public bool IsInterstitialAvailable() =>
        _interstitialLoaded && _sessionInterstitialCount < MAX_INTERSTITIAL_PER_SESSION;

    public void ShowInterstitialIfAvailable()
    {
        if (!IsInterstitialAvailable()) return;

        // TODO: Show actual interstitial here
        Debug.Log("[AdsManager] Interstitial shown.");
        _sessionInterstitialCount++;
        _interstitialLoaded = false;
        AnalyticsManager.Track("interstitial_shown", ("session_count", _sessionInterstitialCount));
        Invoke(nameof(LoadInterstitial), 60f);
    }

    private void LoadInterstitial()
    {
        _interstitialLoaded = true;
    }

    // ──────────────────────────────────────────────
    // Game integration helpers

    public void OfferSpeedUpPayment()
    {
        var contextLabel = GetContextLabel(RewardedContext.CallAccountant);
        UIManager.Instance.ShowRewardedOffer(
            contextLabel,
            "Позвонить в бухгалтерию",
            "−30 минут ожидания оплаты",
            () => ShowRewarded(RewardedContext.CallAccountant,
                onSuccess: () => GameManager.Instance.SpeedUpPayment(usedRewardedAd: true)));
    }

    public void OfferReplaceBingeWorker()
    {
        UIManager.Instance.ShowRewardedOffer(
            GetContextLabel(RewardedContext.FindTempWorkers),
            "Найти временных рабочих",
            "Бригада продолжает работу",
            () => ShowRewarded(RewardedContext.FindTempWorkers,
                onSuccess: () => {
                    // Worker resumes temporarily
                    GameManager.Instance.AddLog("👷 Нашли временщика. Работа продолжается.");
                }));
    }

    public void OfferPtoShortcut()
    {
        UIManager.Instance.ShowRewardedOffer(
            GetContextLabel(RewardedContext.CallPtoContact),
            "Позвонить знакомому в ПТО",
            "ИД принимают с первого раза",
            () => ShowRewarded(RewardedContext.CallPtoContact,
                onSuccess: () => GameManager.Instance.Documents.SubmitWithConnections(GameManager.Instance.State)));
    }

    private string GetContextLabel(RewardedContext ctx) => ctx switch
    {
        RewardedContext.CallAccountant   => "📞 Позвонить бухгалтерии",
        RewardedContext.FindTempWorkers  => "👷 Найти временных",
        RewardedContext.SpeedUpDelivery  => "🚚 Срочная поставка",
        RewardedContext.CallPtoContact   => "📋 Связи в ПТО",
        RewardedContext.GetMicroloan     => "🏦 Срочный займ",
        RewardedContext.ReduceInspectionFine => "🤝 Договориться",
        RewardedContext.FindCheaperSupplier  => "📦 Найти дешевле",
        _ => "Посмотреть рекламу",
    };
}
