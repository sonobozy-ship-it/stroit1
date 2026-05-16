using System;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class RewardedOfferPopupUI : MonoBehaviour
{
    [SerializeField] private GameObject root;
    [SerializeField] private TextMeshProUGUI titleText;
    [SerializeField] private TextMeshProUGUI actionLabelText;
    [SerializeField] private TextMeshProUGUI benefitLabelText;
    [SerializeField] private Button acceptButton;
    [SerializeField] private Button declineButton;

    private Action _onAccept;

    void Start()
    {
        acceptButton.onClick.AddListener(OnAccept);
        declineButton.onClick.AddListener(Hide);
        Hide();
    }

    public void Show(string title, string actionLabel, string benefitLabel, Action onAccept)
    {
        _onAccept = onAccept;
        titleText.text = title;
        actionLabelText.text = actionLabel;
        benefitLabelText.text = benefitLabel;
        root.SetActive(true);
    }

    private void OnAccept()
    {
        Hide();
        AdsManager.Instance.ShowRewarded(
            AdsManager.RewardedContext.FindTempWorkers,
            onSuccess: () => _onAccept?.Invoke(),
            onFail: () => GameManager.Instance.AddLog("📺 Реклама недоступна. Попробуйте позже."));
    }

    private void Hide() => root.SetActive(false);
}
