using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Main screen: current project, active events summary, log, payment wait.
/// </summary>
public class HomeScreenUI : MonoBehaviour
{
    [Header("Project Panel")]
    [SerializeField] private GameObject projectPanel;
    [SerializeField] private TextMeshProUGUI projectEmojiText;
    [SerializeField] private TextMeshProUGUI projectNameText;
    [SerializeField] private TextMeshProUGUI projectClientText;
    [SerializeField] private TextMeshProUGUI projectPhaseText;
    [SerializeField] private Slider projectProgressSlider;
    [SerializeField] private Slider clientMoodSlider;
    [SerializeField] private Image clientMoodFill;
    [SerializeField] private TextMeshProUGUI deadlineText;
    [SerializeField] private Button signKS2Button;
    [SerializeField] private Button submitDocsButton;
    [SerializeField] private GameObject noWorkersWarning;

    [Header("Payment Wait")]
    [SerializeField] private GameObject paymentWaitPanel;
    [SerializeField] private TextMeshProUGUI paymentAmountText;
    [SerializeField] private TextMeshProUGUI paymentTimerText;
    [SerializeField] private Button speedUpAdButton;
    [SerializeField] private Button speedUpConnectionsButton;

    [Header("No Project")]
    [SerializeField] private GameObject noProjectPanel;

    [Header("Events Summary")]
    [SerializeField] private GameObject eventsSummaryPanel;
    [SerializeField] private TextMeshProUGUI eventsCountText;

    [Header("Log")]
    [SerializeField] private Transform logContainer;
    [SerializeField] private GameObject logEntryPrefab;
    private const int MAX_LOG_ENTRIES = 8;

    [Header("Workers Active")]
    [SerializeField] private TextMeshProUGUI activeWorkersText;

    public void Refresh(GameState state)
    {
        RefreshProject(state);
        RefreshEventsSummary(state);
        RefreshLog(state);
        RefreshWorkersSummary(state);
    }

    private void RefreshProject(GameState state)
    {
        var p = state.CurrentProject;

        if (p == null)
        {
            projectPanel.SetActive(false);
            noProjectPanel.SetActive(true);
            paymentWaitPanel.SetActive(false);
            return;
        }

        noProjectPanel.SetActive(false);

        if (p.Phase == ProjectPhase.WaitingPayment)
        {
            projectPanel.SetActive(false);
            RefreshPaymentWait(state, p);
            return;
        }

        paymentWaitPanel.SetActive(false);
        projectPanel.SetActive(true);

        projectEmojiText.text = p.Emoji;
        projectNameText.text = p.Name;
        projectClientText.text = $"Заказчик: {p.Client}";
        projectPhaseText.text = GetPhaseLabel(p.Phase);
        projectProgressSlider.value = p.Progress / 100f;

        clientMoodSlider.value = p.ClientMood / 100f;
        clientMoodFill.color = p.ClientMood > 70 ? Color.green
            : p.ClientMood > 40 ? Color.yellow
            : Color.red;

        var daysLeft = p.DeadlineDay - state.Day;
        deadlineText.text = daysLeft > 0
            ? $"⏰ Дедлайн: {daysLeft} дн."
            : $"🔴 Просрочка: {-daysLeft} дн.";
        deadlineText.color = daysLeft > 5 ? Color.gray : daysLeft > 0 ? Color.yellow : Color.red;

        signKS2Button.gameObject.SetActive(p.Phase == ProjectPhase.SigningKS2);
        submitDocsButton.gameObject.SetActive(p.Phase == ProjectPhase.Documents);

        var activeWorkers = state.HiredWorkers.FindAll(w => !w.IsOnBinge && !w.IsOnAnotherSite);
        noWorkersWarning.SetActive(activeWorkers.Count == 0 && p.Phase == ProjectPhase.Construction);
    }

    private void RefreshPaymentWait(GameState state, ProjectState p)
    {
        paymentWaitPanel.SetActive(true);

        if (state.PendingPayments.Count > 0)
        {
            var payment = state.PendingPayments[0];
            paymentAmountText.text = $"+{FormatMoney(payment.Amount)} ₽";
            var ticksLeft = Mathf.Max(0, payment.ArrivalTick - state.Tick);
            paymentTimerText.text = FormatTicks(ticksLeft);

            speedUpAdButton.interactable = AdsManager.Instance.IsRewardedAvailable();
            speedUpConnectionsButton.interactable = state.Connections >= 5;

            // Show client-specific message
            var clientMsg = p.ClientType switch
            {
                "goszakaz"   => "🏛️ КАЗНАЧЕЙСТВО: принято к рассмотрению",
                "toxic"      => "🙄 Заказчик «рассматривает»",
                "genpodryad" => "📋 Генподрядчик «проверяет акты»",
                _            => "⏳ Оплата в пути",
            };
            paymentTimerText.text = clientMsg + "\n" + paymentTimerText.text;
        }
    }

    private void RefreshEventsSummary(GameState state)
    {
        var count = state.ActiveEvents.Count;
        eventsSummaryPanel.SetActive(count > 0);
        if (count > 0)
            eventsCountText.text = $"⚠️ {count} {Plural(count, "проблема", "проблемы", "проблем")}";
    }

    private void RefreshLog(GameState state)
    {
        foreach (Transform child in logContainer) Destroy(child.gameObject);
        var entries = state.Log;
        var max = Mathf.Min(entries.Count, MAX_LOG_ENTRIES);
        for (int i = 0; i < max; i++)
        {
            var go = Instantiate(logEntryPrefab, logContainer);
            go.GetComponent<TextMeshProUGUI>().text = entries[i].Message;
            var canvasGroup = go.GetComponent<CanvasGroup>();
            if (canvasGroup != null) canvasGroup.alpha = 1f - (i * 0.1f);
        }
    }

    private void RefreshWorkersSummary(GameState state)
    {
        var active = state.HiredWorkers.FindAll(w => !w.IsOnBinge && !w.IsOnAnotherSite).Count;
        var total = state.HiredWorkers.Count;
        activeWorkersText.text = total > 0
            ? $"👷 {active}/{total} на объекте"
            : "👷 Бригады нет";
    }

    // ──────────────────────────────────────────────
    // Button handlers

    public void OnSignKS2() => GameManager.Instance.SignKS2();

    public void OnSubmitDocs() => UIManager.Instance.ShowDocumentMiniGame(GameManager.Instance.State.CurrentProject);

    public void OnSpeedUpAd() => AdsManager.Instance.OfferSpeedUpPayment();

    public void OnSpeedUpConnections()
    {
        GameManager.Instance.SpeedUpPayment(usedRewardedAd: false);
    }

    public void OnOpenEvents() => UIManager.Instance.ShowEventPopup(GameManager.Instance.State.ActiveEvents[0]);

    // ──────────────────────────────────────────────
    private static string GetPhaseLabel(ProjectPhase phase) => phase switch
    {
        ProjectPhase.Procurement    => "🚚 Закупка материалов",
        ProjectPhase.Construction   => "🏗️ Строительство",
        ProjectPhase.Finishing      => "🖌️ Отделка",
        ProjectPhase.Documents      => "📋 Сдача ИД",
        ProjectPhase.SigningKS2     => "✍️ Подписание КС-2",
        ProjectPhase.WaitingPayment => "💰 Ожидание оплаты",
        _                           => "",
    };

    private static string FormatMoney(long amount) => amount switch
    {
        >= 1_000_000 => $"{amount / 1_000_000f:F1}М",
        >= 1_000     => $"{amount / 1_000f:F0}к",
        _            => $"{amount}",
    };

    private static string FormatTicks(int ticks) => ticks switch
    {
        0        => "Поступает...",
        < 60     => $"{ticks} сек",
        < 3600   => $"{ticks / 60} мин {ticks % 60} сек",
        _        => $"{ticks / 3600} ч {(ticks % 3600) / 60} мин",
    };

    private static string Plural(int n, string one, string few, string many)
    {
        var mod10 = n % 10;
        var mod100 = n % 100;
        if (mod10 == 1 && mod100 != 11) return one;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
        return many;
    }
}
