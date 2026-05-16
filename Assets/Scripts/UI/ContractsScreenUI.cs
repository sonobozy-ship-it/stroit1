using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class ContractsScreenUI : MonoBehaviour
{
    [Header("Current Project")]
    [SerializeField] private GameObject activeProjectPanel;
    [SerializeField] private TextMeshProUGUI projectNameText;
    [SerializeField] private TextMeshProUGUI projectClientText;
    [SerializeField] private TextMeshProUGUI projectPhaseText;
    [SerializeField] private Slider projectProgressBar;
    [SerializeField] private TextMeshProUGUI deadlineText;

    [Header("No Contract")]
    [SerializeField] private GameObject noContractPanel;
    [SerializeField] private Button findContractButton;

    void Start()
    {
        findContractButton.onClick.AddListener(OnFindContract);
    }

    public void Refresh(GameState state)
    {
        var project = state.CurrentProject;
        bool hasProject = project != null && project.Phase != ProjectPhase.Completed;

        activeProjectPanel.SetActive(hasProject);
        noContractPanel.SetActive(!hasProject);

        if (!hasProject) return;

        projectNameText.text = $"{project.Emoji} {project.Name}";
        projectClientText.text = $"Клиент: {project.Client}";
        projectPhaseText.text = PhaseLabel(project.Phase);
        projectProgressBar.value = project.Progress;

        int daysLeft = project.DeadlineDay - state.Day;
        deadlineText.text = daysLeft > 0
            ? $"Дедлайн через {daysLeft} дн."
            : $"Просрочено на {-daysLeft} дн.";
        deadlineText.color = daysLeft <= 3 ? Color.red : Color.white;
    }

    private static string PhaseLabel(ProjectPhase phase) => phase switch
    {
        ProjectPhase.Procurement    => "⚙️ Закупка",
        ProjectPhase.Construction   => "🏗️ Строительство",
        ProjectPhase.Finishing      => "🪟 Отделка",
        ProjectPhase.Documents      => "📋 Документы",
        ProjectPhase.SigningKS2     => "✍️ Подписание КС-2",
        ProjectPhase.WaitingPayment => "⏳ Ожидание оплаты",
        ProjectPhase.Completed      => "✅ Завершён",
        _ => "—",
    };

    private void OnFindContract()
    {
        // TODO: open contract market
        GameManager.Instance.AddLog("📄 Рынок контрактов — в разработке");
    }
}
