using TMPro;
using UnityEngine;

public class PaymentWaitUI : MonoBehaviour
{
    [SerializeField] private GameObject root;
    [SerializeField] private TextMeshProUGUI clientText;
    [SerializeField] private TextMeshProUGUI statusText;
    [SerializeField] private TextMeshProUGUI amountText;

    void Start() => root.SetActive(false);

    public void Refresh(GameState state)
    {
        var project = state.CurrentProject;
        if (project == null || project.Phase != ProjectPhase.WaitingPayment)
        {
            root.SetActive(false);
            return;
        }

        root.SetActive(true);
        clientText.text = $"{project.Emoji} {project.Client}";

        long remaining = project.ContractValue - project.AdvancePaid + project.ExtraRevenue - project.AccruedPenalties;
        amountText.text = $"Ожидаемая оплата: {FormatMoney(remaining)}";

        if (project.OverdueDays > 0)
            statusText.text = $"⚠️ Просрочено {project.OverdueDays} дн.";
        else
            statusText.text = "⏳ Ожидаем перевод от клиента...";
    }

    private static string FormatMoney(long amount)
    {
        if (amount >= 1_000_000) return $"{amount / 1_000_000f:0.#}М ₽";
        if (amount >= 1_000) return $"{amount / 1_000f:0.#}К ₽";
        return $"{amount} ₽";
    }
}
