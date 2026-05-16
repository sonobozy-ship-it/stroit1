using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

/// <summary>
/// Full-screen event popup. Shows event details and action buttons.
/// Stacks multiple events — player resolves them one by one.
/// </summary>
public class EventPopupUI : MonoBehaviour
{
    [SerializeField] private GameObject root;
    [SerializeField] private TextMeshProUGUI emojiText;
    [SerializeField] private TextMeshProUGUI titleText;
    [SerializeField] private TextMeshProUGUI descriptionText;
    [SerializeField] private TextMeshProUGUI timerText;
    [SerializeField] private Transform optionsContainer;
    [SerializeField] private GameObject optionButtonPrefab;
    [SerializeField] private TextMeshProUGUI eventCounterText; // "1 из 3"
    [SerializeField] private Image urgentBorder;

    public bool IsVisible => root.activeSelf;

    private ActiveEventState _currentEvent;
    private List<GameObject> _optionButtons = new();

    void Start() => Hide();

    public void Show(ActiveEventState ev)
    {
        _currentEvent = ev;
        root.SetActive(true);

        emojiText.text = ev.Emoji;
        titleText.text = ev.Title;
        descriptionText.text = ev.Description;

        urgentBorder.gameObject.SetActive(ev.IsUrgent);

        BuildOptionButtons(ev);
        RefreshCounter();
        RefreshTimer(ev);
    }

    public void ShowNext(GameState state)
    {
        if (state.ActiveEvents.Count == 0) { Hide(); return; }
        Show(state.ActiveEvents[0]);
    }

    public void Hide()
    {
        root.SetActive(false);
        _currentEvent = null;
    }

    private void BuildOptionButtons(ActiveEventState ev)
    {
        foreach (var btn in _optionButtons) Destroy(btn);
        _optionButtons.Clear();

        for (int i = 0; i < ev.Options.Count; i++)
        {
            var opt = ev.Options[i];
            var idx = i;

            var btnGo = Instantiate(optionButtonPrefab, optionsContainer);
            var btnComp = btnGo.GetComponent<EventOptionButton>();
            btnComp.Setup(opt, () => OnOptionSelected(idx));
            _optionButtons.Add(btnGo);
        }
    }

    private void OnOptionSelected(int optionIndex)
    {
        if (_currentEvent == null) return;
        var opt = _currentEvent.Options[optionIndex];

        // Check if requires rewarded ad
        if (opt.RequiresRewardedAd)
        {
            AdsManager.Instance.ShowRewarded(
                AdsManager.RewardedContext.FindTempWorkers,
                onSuccess: () => {
                    GameManager.Instance.ResolveEvent(_currentEvent.InstanceId, optionIndex, usedRewardedAd: true);
                    ShowNext(GameManager.Instance.State);
                },
                onFail: () => {
                    // Ad not available — show message
                    GameManager.Instance.AddLog("📺 Реклама недоступна. Попробуйте позже.");
                });
            return;
        }

        GameManager.Instance.ResolveEvent(_currentEvent.InstanceId, optionIndex);
        ShowNext(GameManager.Instance.State);
    }

    private void RefreshCounter()
    {
        var count = GameManager.Instance.State.ActiveEvents.Count;
        eventCounterText.text = count > 1 ? $"⚠️ Событий: {count}" : "";
    }

    private void RefreshTimer(ActiveEventState ev)
    {
        var sec = Mathf.Max(0, ev.TicksLeft);
        timerText.text = sec < 60
            ? $"Авторазрешение через {sec} сек"
            : $"Авторазрешение через {sec / 60} мин";
        timerText.color = sec < 30 ? Color.red : Color.gray;
    }

    void Update()
    {
        if (_currentEvent != null && root.activeSelf)
            RefreshTimer(_currentEvent);
    }
}
