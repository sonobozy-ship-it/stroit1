using UnityEngine;

/// <summary>
/// Tracks per-client history. After 2+ successful projects:
/// client becomes "regular" → better advance, faster payment, higher starting mood.
/// </summary>
public class ClientRelationsSystem : MonoBehaviour
{
    // Called after a project is finalized
    public void RecordCompletion(ProjectState project, GameState state)
    {
        if (string.IsNullOrEmpty(project.ClientId)) return;

        if (!state.ClientRelations.TryGetValue(project.ClientId, out var relation))
        {
            relation = new ClientRelation
            {
                ClientId = project.ClientId,
                ClientName = project.Client,
                ClientType = project.ClientType,
            };
            state.ClientRelations[project.ClientId] = relation;
        }

        relation.ProjectsCompleted++;

        // Rolling average of mood
        relation.AverageMoodAtClose =
            (relation.AverageMoodAtClose * (relation.ProjectsCompleted - 1) + project.ClientMood)
            / relation.ProjectsCompleted;

        // Payment speed bonus stacks per successful project (capped at 300 ticks = 5 min)
        if (project.ClientMood >= 60)
            relation.PaymentSpeedBonus = Mathf.Min(300, relation.PaymentSpeedBonus + 60);

        // Advance percent bonus (up to +10%)
        if (project.ClientMood >= 70)
            relation.AdvancePercentBonus = Mathf.Min(0.10f, relation.AdvancePercentBonus + 0.02f);

        // Become a regular client
        var wasRegular = relation.IsRegular;
        relation.IsRegular = relation.ProjectsCompleted >= 2 && relation.AverageMoodAtClose >= 60f;

        if (relation.IsRegular && !wasRegular)
        {
            GameManager.Instance.AddLog(
                $"🤝 {relation.ClientName} стал постоянным заказчиком. Аванс больше, оплата быстрее.");
            AnalyticsManager.Track("client_became_regular", ("client", relation.ClientId));
        }
    }

    public void RecordAbandonment(ProjectState project, GameState state)
    {
        if (string.IsNullOrEmpty(project.ClientId)) return;

        if (!state.ClientRelations.TryGetValue(project.ClientId, out var relation))
        {
            relation = new ClientRelation { ClientId = project.ClientId, ClientName = project.Client };
            state.ClientRelations[project.ClientId] = relation;
        }

        relation.IsBlacklisted = true;
        relation.IsRegular = false;
        GameManager.Instance.AddLog($"⛔ {project.Client} занесён в чёрный список. Работать с ним больше не стоит.");
    }

    /// <summary>Returns advance % modifier for a known client (0 = no bonus).</summary>
    public float GetAdvanceBonus(string clientId, GameState state)
    {
        if (state.ClientRelations.TryGetValue(clientId, out var rel) && rel.IsRegular)
            return rel.AdvancePercentBonus;
        return 0f;
    }

    /// <summary>Returns tick reduction on payment wait for a known client.</summary>
    public int GetPaymentSpeedBonus(string clientId, GameState state)
    {
        if (state.ClientRelations.TryGetValue(clientId, out var rel) && rel.IsRegular)
            return (int)rel.PaymentSpeedBonus;
        return 0;
    }

    /// <summary>Mood boost at project start for regular clients.</summary>
    public float GetStartingMoodBonus(string clientId, GameState state)
    {
        if (state.ClientRelations.TryGetValue(clientId, out var rel) && rel.IsRegular)
            return Mathf.Min(15f, rel.ProjectsCompleted * 3f);
        return 0f;
    }

    public ClientRelation GetRelation(string clientId, GameState state) =>
        state.ClientRelations.GetValueOrDefault(clientId);
}
