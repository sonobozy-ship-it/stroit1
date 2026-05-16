using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// ИД submission mini-game UI.
/// Player presses "Сдать ИД" → ПТО reviews → returns with reason (or accepts).
/// Core meme moment of the game.
/// </summary>
public class DocumentMiniGameUI : MonoBehaviour
{
    [SerializeField] private GameObject root;

    [Header("Status")]
    [SerializeField] private TextMeshProUGUI iterationText;    // "Итерация 3 / 4"
    [SerializeField] private TextMeshProUGUI rejectionText;    // rejection reason
    [SerializeField] private GameObject rejectionPanel;
    [SerializeField] private GameObject waitingPanel;          // "ПТО изучает документы..."

    [Header("Buttons")]
    [SerializeField] private Button submitButton;
    [SerializeField] private TextMeshProUGUI submitButtonLabel;
    [SerializeField] private Button submitWithConnectionsButton; // costs 20 Связей
    [SerializeField] private Button adButton;                    // rewarded ad shortcut

    [Header("Progress")]
    [SerializeField] private Slider iterationSlider;           // fills as iterations complete
    [SerializeField] private Image sliderFill;

    public bool IsVisible => root.activeSelf;

    private ProjectState _project;
    private bool _isWaiting = false;

    void Start() => Hide();

    public void Show(ProjectState project)
    {
        _project = project;
        root.SetActive(true);
        _isWaiting = false;
        Refresh();
    }

    public void Hide()
    {
        root.SetActive(false);
        _project = null;
    }

    private void Refresh()
    {
        if (_project == null) return;

        var current = _project.DocumentRejections;
        var max = _project.DocumentMaxIterations;
        var hasRejection = _project.RejectionReasons.Count > 0;

        iterationText.text = $"Итерация {current} / {max}";
        iterationSlider.value = (float)current / max;
        sliderFill.color = current == 0 ? Color.yellow : current >= max - 1 ? Color.green : Color.Lerp(Color.yellow, Color.green, (float)current / max);

        rejectionPanel.SetActive(hasRejection && !_isWaiting);
        waitingPanel.SetActive(_isWaiting);

        if (hasRejection && _project.RejectionReasons.Count > 0)
        {
            var lastReason = _project.RejectionReasons[^1];
            rejectionText.text = $"«{lastReason}»";
        }

        // Submit button label changes based on state
        if (current == 0)
            submitButtonLabel.text = "📋 Сдать ИД";
        else if (hasRejection)
            submitButtonLabel.text = "🔄 Сдать повторно";
        else
            submitButtonLabel.text = "✅ Готово";

        submitButton.interactable = !_isWaiting;

        var gm = GameManager.Instance;
        submitWithConnectionsButton.interactable = gm.State.Connections >= 20;
        adButton.interactable = AdsManager.Instance.IsRewardedAvailable();
    }

    public void OnSubmitPressed()
    {
        if (_isWaiting) return;
        _isWaiting = true;
        waitingPanel.SetActive(true);
        rejectionPanel.SetActive(false);

        // Simulate ПТО review delay (dramatic effect)
        Invoke(nameof(FinishReview), Random.Range(1.5f, 3f));
    }

    private void FinishReview()
    {
        _isWaiting = false;
        GameManager.Instance.SubmitDocuments();
        _project = GameManager.Instance.State.CurrentProject;

        if (_project == null || _project.Phase != ProjectPhase.Documents)
        {
            // Documents accepted, phase changed
            Hide();
            return;
        }

        Refresh();
    }

    public void OnSubmitWithConnectionsPressed()
    {
        GameManager.Instance.Documents.SubmitWithConnections(GameManager.Instance.State);
        _project = GameManager.Instance.State.CurrentProject;

        if (_project == null || _project.Phase != ProjectPhase.Documents)
            Hide();
        else
            Refresh();
    }

    public void OnAdButtonPressed()
    {
        AdsManager.Instance.OfferPtoShortcut();
    }
}
