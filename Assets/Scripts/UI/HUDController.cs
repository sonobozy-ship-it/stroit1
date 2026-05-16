using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Top HUD: money, stress bar, reputation, company name, event badge.
/// </summary>
public class HUDController : MonoBehaviour
{
    [Header("Money")]
    [SerializeField] private TextMeshProUGUI moneyText;
    [SerializeField] private TextMeshProUGUI cashflowText; // daily burn indicator

    [Header("Stress")]
    [SerializeField] private Slider stressSlider;
    [SerializeField] private Image stressSliderFill;
    [SerializeField] private TextMeshProUGUI stressLabel;
    [SerializeField] private Color stressLow;
    [SerializeField] private Color stressMid;
    [SerializeField] private Color stressHigh;

    [Header("Reputation")]
    [SerializeField] private TextMeshProUGUI reputationText;
    [SerializeField] private Image reputationIcon;

    [Header("Event Badge")]
    [SerializeField] private GameObject eventBadge;
    [SerializeField] private TextMeshProUGUI eventBadgeCount;

    [Header("Pending Payment")]
    [SerializeField] private GameObject paymentPendingIndicator;
    [SerializeField] private TextMeshProUGUI paymentTimerText;

    public void Refresh(GameState state)
    {
        RefreshMoney(state);
        RefreshStress(state);
        RefreshReputation(state);
        RefreshEventBadge(state);
        RefreshPaymentTimer(state);
    }

    private void RefreshMoney(GameState state)
    {
        var money = state.Money;
        var isNegative = money < 0;
        moneyText.text = isNegative
            ? $"<color=#E74C3C>−{FormatMoney(Mathf.Abs((float)money))}</color>"
            : FormatMoney((float)money);
        moneyText.text += " ₽";

        var burn = GameManager.Instance.Finance.GetDailyBurn(state);
        var runway = GameManager.Instance.Finance.GetDaysOfRunway(state);
        cashflowText.text = burn > 0
            ? $"−{FormatMoney((float)burn)}/день · {runway} дн."
            : "";
        cashflowText.color = runway <= 2 ? Color.red : runway <= 5 ? new Color(1f, 0.5f, 0f) : Color.gray;
    }

    private void RefreshStress(GameState state)
    {
        stressSlider.value = state.Stress / 100f;
        stressSliderFill.color = state.Stress switch
        {
            < 40 => stressLow,
            < 70 => stressMid,
            _    => stressHigh,
        };
        stressLabel.text = state.Stress switch
        {
            < 30 => "Норм",
            < 60 => "Напряг",
            < 80 => "Горит",
            _    => "ПАНИКА",
        };
    }

    private void RefreshReputation(GameState state)
    {
        reputationText.text = $"{state.Reputation:F0}";
        reputationIcon.color = state.Reputation > 70
            ? Color.green
            : state.Reputation > 40
                ? Color.yellow
                : Color.red;
    }

    private void RefreshEventBadge(GameState state)
    {
        var count = state.ActiveEvents.Count;
        eventBadge.SetActive(count > 0);
        eventBadgeCount.text = count.ToString();
    }

    private void RefreshPaymentTimer(GameState state)
    {
        if (state.PendingPayments.Count == 0)
        {
            paymentPendingIndicator.SetActive(false);
            return;
        }

        paymentPendingIndicator.SetActive(true);
        var next = state.PendingPayments[0];
        var ticksLeft = next.ArrivalTick - state.Tick;
        var secondsLeft = Mathf.Max(0, ticksLeft);

        paymentTimerText.text = secondsLeft switch
        {
            0   => "💰 Оплата поступает...",
            < 60 => $"💰 Оплата через {secondsLeft} сек",
            < 3600 => $"💰 Оплата через {secondsLeft / 60} мин",
            _   => $"💰 КАЗНАЧЕЙСТВО: {secondsLeft / 3600:F1} ч",
        };
    }

    private static string FormatMoney(float amount) => amount switch
    {
        >= 1_000_000 => $"{amount / 1_000_000f:F1}М",
        >= 1_000     => $"{amount / 1_000f:F0}к",
        _            => $"{amount:F0}",
    };
}
