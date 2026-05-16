using System;
using UnityEngine;

public enum Screen
{
    Home,
    Brigade,
    Contracts,
    Upgrades,
}

/// <summary>
/// Root UI controller. Manages screen switching and global popups.
/// All other UI controllers register themselves here.
/// </summary>
public class UIManager : MonoBehaviour
{
    public static UIManager Instance { get; private set; }

    [Header("Screens")]
    [SerializeField] private GameObject homeScreen;
    [SerializeField] private GameObject brigadeScreen;
    [SerializeField] private GameObject contractsScreen;
    [SerializeField] private GameObject upgradesScreen;

    [Header("Popups")]
    [SerializeField] private EventPopupUI eventPopup;
    [SerializeField] private RewardedOfferPopupUI rewardedOfferPopup;
    [SerializeField] private DocumentMiniGameUI documentMiniGame;
    [SerializeField] private PaymentWaitUI paymentWaitUI;
    [SerializeField] private GameOverUI gameOverUI;

    [Header("HUD")]
    [SerializeField] private HUDController hud;

    private Screen _currentScreen = Screen.Home;

    void Awake()
    {
        if (Instance != null) { Destroy(gameObject); return; }
        Instance = this;
    }

    void OnEnable()
    {
        GameManager.OnStateChanged += OnStateChanged;
        GameManager.OnGameOver += ShowGameOver;
    }

    void OnDisable()
    {
        GameManager.OnStateChanged -= OnStateChanged;
        GameManager.OnGameOver -= ShowGameOver;
    }

    void Start()
    {
        SwitchScreen(Screen.Home);
        RefreshAll(GameManager.Instance.State);
    }

    // ──────────────────────────────────────────────
    public void SwitchScreen(Screen screen)
    {
        _currentScreen = screen;
        homeScreen.SetActive(screen == Screen.Home);
        brigadeScreen.SetActive(screen == Screen.Brigade);
        contractsScreen.SetActive(screen == Screen.Contracts);
        upgradesScreen.SetActive(screen == Screen.Upgrades);
    }

    private void OnStateChanged(GameState state)
    {
        hud?.Refresh(state);
        RefreshCurrentScreen(state);

        // Auto-show event popup if there are urgent events
        if (state.ActiveEvents.Count > 0 && !eventPopup.IsVisible)
            eventPopup.ShowNext(state);

        // Auto-show payment wait UI
        if (state.CurrentProject?.Phase == ProjectPhase.WaitingPayment)
            paymentWaitUI?.Refresh(state);

        // Show document mini-game when phase changes to Documents
        if (state.CurrentProject?.Phase == ProjectPhase.Documents && !documentMiniGame.IsVisible)
            documentMiniGame?.Show(state.CurrentProject);
    }

    private void RefreshCurrentScreen(GameState state)
    {
        switch (_currentScreen)
        {
            case Screen.Home:
                homeScreen.GetComponent<HomeScreenUI>()?.Refresh(state);
                break;
            case Screen.Brigade:
                brigadeScreen.GetComponent<BrigadeScreenUI>()?.Refresh(state);
                break;
            case Screen.Contracts:
                contractsScreen.GetComponent<ContractsScreenUI>()?.Refresh(state);
                break;
        }
    }

    private void RefreshAll(GameState state)
    {
        hud?.Refresh(state);
        homeScreen.GetComponent<HomeScreenUI>()?.Refresh(state);
    }

    // ──────────────────────────────────────────────
    // Popup API

    public void ShowEventPopup(ActiveEventState eventState) =>
        eventPopup?.Show(eventState);

    public void ShowRewardedOffer(string title, string actionLabel, string benefitLabel, Action onAccept) =>
        rewardedOfferPopup?.Show(title, actionLabel, benefitLabel, onAccept);

    public void ShowDocumentMiniGame(ProjectState project) =>
        documentMiniGame?.Show(project);

    public void ShowGameOver() =>
        gameOverUI?.Show(GameManager.Instance.State);

    // ──────────────────────────────────────────────
    // Tab bar buttons (called from UI)
    public void OnTabHome() => SwitchScreen(Screen.Home);
    public void OnTabBrigade() => SwitchScreen(Screen.Brigade);
    public void OnTabContracts() => SwitchScreen(Screen.Contracts);
    public void OnTabUpgrades() => SwitchScreen(Screen.Upgrades);
}
