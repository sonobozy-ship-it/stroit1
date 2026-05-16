using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class BrigadeScreenUI : MonoBehaviour
{
    [SerializeField] private Transform workerListContainer;
    [SerializeField] private GameObject workerCardPrefab;
    [SerializeField] private TextMeshProUGUI dailyPayrollText;
    [SerializeField] private TextMeshProUGUI workerCountText;
    [SerializeField] private Button hireWorkerButton;

    private readonly List<GameObject> _cards = new();

    void Start()
    {
        hireWorkerButton.onClick.AddListener(OnHireWorker);
    }

    public void Refresh(GameState state)
    {
        foreach (var c in _cards) Destroy(c);
        _cards.Clear();

        foreach (var worker in state.HiredWorkers)
        {
            var card = Instantiate(workerCardPrefab, workerListContainer);
            SetupWorkerCard(card, worker);
            _cards.Add(card);
        }

        long totalPayroll = 0;
        foreach (var w in state.HiredWorkers) totalPayroll += w.DailyCost;

        workerCountText.text = $"Бригада: {state.HiredWorkers.Count} чел.";
        dailyPayrollText.text = $"Зарплата/день: {FormatMoney(totalPayroll)}";
    }

    private static void SetupWorkerCard(GameObject card, HiredWorkerState worker)
    {
        var texts = card.GetComponentsInChildren<TextMeshProUGUI>();
        if (texts.Length == 0) return;

        string status = "";
        if (worker.IsOnBinge) status = " 🍺";
        else if (worker.IsOnAnotherSite) status = " 🚧";

        texts[0].text = $"{worker.Emoji} {worker.Name}{status}";
        if (texts.Length > 1)
            texts[1].text = $"Эфф: {worker.Efficiency * 100:0}% | {FormatMoney(worker.DailyCost)}/д";
    }

    private void OnHireWorker()
    {
        // TODO: open worker market popup
        GameManager.Instance.AddLog("🔍 Рынок рабочих — в разработке");
    }

    private static string FormatMoney(long amount)
    {
        if (amount >= 1_000_000) return $"{amount / 1_000_000f:0.#}М ₽";
        if (amount >= 1_000) return $"{amount / 1_000f:0.#}К ₽";
        return $"{amount} ₽";
    }
}
