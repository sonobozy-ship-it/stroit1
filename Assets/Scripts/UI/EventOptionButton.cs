using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class EventOptionButton : MonoBehaviour
{
    [SerializeField] private TextMeshProUGUI labelText;
    [SerializeField] private TextMeshProUGUI costText;
    [SerializeField] private Button button;

    public void Setup(EventOptionState option, Action onClick)
    {
        labelText.text = option.Label;

        if (option.Cost > 0)
            costText.text = $"-{FormatMoney(option.Cost)}";
        else if (option.ConnectionsCost > 0)
            costText.text = $"-{option.ConnectionsCost} связей";
        else if (option.RequiresRewardedAd)
            costText.text = "📺 Реклама";
        else
            costText.text = "";

        button.onClick.RemoveAllListeners();
        button.onClick.AddListener(() => onClick?.Invoke());
    }

    private static string FormatMoney(long amount)
    {
        if (amount >= 1_000_000) return $"{amount / 1_000_000f:0.#}М ₽";
        if (amount >= 1_000) return $"{amount / 1_000f:0.#}К ₽";
        return $"{amount} ₽";
    }
}
