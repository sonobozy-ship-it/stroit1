using UnityEngine;

/// <summary>
/// Handles ИД (executive documentation) submission mini-game.
/// The player submits documents → ПТО reviews → finds a "problem" → returns for revision.
/// After enough successful submissions (or using Connections), КС-2 becomes signable.
/// </summary>
public class DocumentSystem : MonoBehaviour
{
    private static readonly string[] REJECTION_REASONS =
    {
        "Нет подписи на листе 48",
        "Не совпадает дата в журнале работ",
        "Отсутствует печать на акте скрытых работ №3",
        "Неправильный шрифт в исполнительной схеме",
        "Не хватает фотофиксации узла Б-4",
        "ПТО требует повторного освидетельствования сварных швов",
        "Сертификат на кабель устарел",
        "Схема не соответствует проектной документации",
        "Подпись не соответствует образцу в карточке",
        "Документы переданы не в той папке (нужна папка-скоросшиватель)",
        "ПТО потеряло папку. Просим подать заново.",
        "Формат файла не принимается. Нужен Word, не PDF.",
        "Акт подписан не тем цветом ручки",
        "Отсутствует протокол испытания системы вентиляции",
        "Исполнительная схема не откалибрована по ГГС",
    };

    public void Submit(GameState state)
    {
        var p = state.CurrentProject;
        if (p == null || p.Phase != ProjectPhase.Documents) return;

        p.DocumentRejections++;
        state.Stress = Mathf.Min(100, state.Stress + 5);

        if (p.DocumentRejections >= p.DocumentMaxIterations)
        {
            // Documents finally accepted
            AcceptDocuments(state);
        }
        else
        {
            // ПТО found a problem
            var reason = REJECTION_REASONS[Random.Range(0, REJECTION_REASONS.Length)];
            p.RejectionReasons.Add(reason);

            var iteration = p.DocumentRejections;
            var remaining = p.DocumentMaxIterations - iteration;

            GameManager.Instance.AddLog(
                $"📋 ПТО вернуло ИД (раз {iteration}/{p.DocumentMaxIterations}): «{reason}»");

            if (remaining == 1)
                GameManager.Instance.AddLog("💡 Ещё одна сдача — и примут. Наверное.");
        }
    }

    public void SubmitWithConnections(GameState state)
    {
        var p = state.CurrentProject;
        if (p == null || p.Phase != ProjectPhase.Documents) return;

        const long connectionsCost = 20;
        if (state.Connections < connectionsCost)
        {
            GameManager.Instance.AddLog("❌ Недостаточно Связей (нужно 20).");
            return;
        }

        state.Connections -= connectionsCost;
        AcceptDocuments(state);
        GameManager.Instance.AddLog("🤝 Позвонили знакомому в ПТО. ИД приняли с первого раза.");
    }

    private void AcceptDocuments(GameState state)
    {
        var p = state.CurrentProject;
        p.DocumentsReady = true;
        p.Phase = ProjectPhase.SigningKS2;
        state.Stress = Mathf.Max(0, state.Stress - 5);
        state.Reputation = Mathf.Min(100, state.Reputation + 2);

        GameManager.Instance.AddLog(
            p.DocumentRejections <= 1
                ? "✅ ИД принято с первого раза. Вы легенда."
                : $"✅ ИД наконец принято (после {p.DocumentRejections} итераций). Можно подписывать КС-2.");
    }
}
