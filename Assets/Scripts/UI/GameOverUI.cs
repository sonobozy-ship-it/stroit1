using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class GameOverUI : MonoBehaviour
{
    [SerializeField] private GameObject root;
    [SerializeField] private TextMeshProUGUI headlineText;
    [SerializeField] private TextMeshProUGUI statsText;
    [SerializeField] private Button restartButton;

    void Start()
    {
        restartButton.onClick.AddListener(OnRestart);
        root.SetActive(false);
    }

    public void Show(GameState state)
    {
        root.SetActive(true);
        headlineText.text = "🏚️ Компания обанкротилась";

        int projects = state.CompletedProjects.Count;
        statsText.text =
            $"Дней проработали: {state.Day}\n" +
            $"Проектов завершено: {projects}\n" +
            $"Всего заработано: {FormatMoney(state.TotalEarned)}\n" +
            $"Уровень компании: {state.CompanyLevel}";
    }

    private void OnRestart()
    {
        UnityEngine.SceneManagement.SceneManager.LoadScene(0);
    }

    private static string FormatMoney(long amount)
    {
        if (amount >= 1_000_000) return $"{amount / 1_000_000f:0.#}М ₽";
        if (amount >= 1_000) return $"{amount / 1_000f:0.#}К ₽";
        return $"{amount} ₽";
    }
}
