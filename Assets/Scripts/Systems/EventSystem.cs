using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using Random = UnityEngine.Random;

public class EventSystem : MonoBehaviour
{
    [SerializeField] private GameEventDefinition[] _allEvents;

    private const int MAX_ACTIVE_EVENTS = 3;

    public void ProcessTick(GameState state)
    {
        // Tick down active events, auto-resolve expired ones
        var expired = state.ActiveEvents.Where(e => e.TicksLeft <= 0).ToList();
        foreach (var ev in expired) AutoResolve(ev, state);
        foreach (var ev in expired) state.ActiveEvents.Remove(ev);

        foreach (var ev in state.ActiveEvents) ev.TicksLeft--;

        // Try to spawn new events
        if (state.ActiveEvents.Count < MAX_ACTIVE_EVENTS && state.CurrentProject != null)
        {
            TrySpawnEvent(state);
        }
    }

    private void TrySpawnEvent(GameState state)
    {
        var proj = state.CurrentProject;
        var baseChance = 0.005f * proj.EventMultiplier;

        if (Random.value > baseChance) return;

        // Pick eligible event
        var activeIds = state.ActiveEvents.Select(e => e.EventId).ToHashSet();
        var eligible = _allEvents.Where(ev =>
            !activeIds.Contains(ev.Id) &&
            !ev.IsLiveOpsEvent &&
            IsEventEligible(ev, state)
        ).ToArray();

        if (eligible.Length == 0) return;

        var def = eligible[Random.Range(0, eligible.Length)];
        SpawnEvent(def, state);
    }

    private bool IsEventEligible(GameEventDefinition ev, GameState state)
    {
        if (ev.RequiresActiveProject && state.CurrentProject == null) return false;

        // Worker events require workers
        if (ev.Category == EventCategory.Workers && state.HiredWorkers.Count == 0) return false;

        // Client events require a client
        if (ev.Category == EventCategory.Client && state.CurrentProject == null) return false;

        return true;
    }

    private void SpawnEvent(GameEventDefinition def, GameState state)
    {
        var instance = new ActiveEventState
        {
            EventId = def.Id,
            InstanceId = Guid.NewGuid().ToString("N")[..8],
            Title = def.Title,
            Description = def.Description,
            Emoji = def.Emoji,
            TicksLeft = def.AutoResolveAfterTicks,
            AutoResolveOptionIndex = def.AutoResolveOptionIndex,
            IsUrgent = def.IsUrgent,
            Options = def.Options.Select(o => new EventOptionState
            {
                Label = o.Label,
                Cost = o.Cost,
                ProgressPenalty = o.ProgressPenalty,
                StressDelta = o.StressDelta,
                ReputationDelta = o.ReputationDelta,
                ClientMoodDelta = o.ClientMoodDelta,
                ConnectionsCost = o.ConnectionsCost,
                RequiresRewardedAd = o.RequiresRewardedAd,
                Outcome = o.Outcome,
            }).ToList(),
        };

        state.ActiveEvents.Add(instance);
        state.Stress = Mathf.Min(100, state.Stress + 3);
        GameManager.Instance.AddLog($"⚠️ Новое событие: {def.Title}");
        AnalyticsManager.Track("event_spawned", ("id", def.Id));
    }

    public void Resolve(string instanceId, int optionIndex, bool usedRewardedAd, GameState state)
    {
        var ev = state.ActiveEvents.FirstOrDefault(e => e.InstanceId == instanceId);
        if (ev == null) return;

        var opt = ev.Options[optionIndex];

        // Validate connections cost
        if (opt.ConnectionsCost > state.Connections)
        {
            GameManager.Instance.AddLog("❌ Недостаточно Связей.");
            return;
        }

        ApplyOption(opt, state, false);
        state.ActiveEvents.Remove(ev);
        AnalyticsManager.Track("event_resolved", ("id", ev.EventId), ("option", optionIndex));
    }

    private void AutoResolve(ActiveEventState ev, GameState state)
    {
        var opt = ev.Options[ev.AutoResolveOptionIndex];
        ApplyOption(opt, state, isAuto: true);
        GameManager.Instance.AddLog($"⏱️ «{ev.Title}» разрешилось само — не в вашу пользу.");
    }

    private void ApplyOption(EventOptionState opt, GameState state, bool isAuto)
    {
        var stressExtra = isAuto ? 5f : 0f;

        state.Money -= opt.Cost;
        state.Connections -= opt.ConnectionsCost;
        state.Stress = Mathf.Clamp(state.Stress + opt.StressDelta + stressExtra, 0, 100);
        state.Reputation = Mathf.Clamp(state.Reputation + opt.ReputationDelta, 0, 100);

        if (state.CurrentProject != null)
        {
            state.CurrentProject.Progress = Mathf.Max(0, state.CurrentProject.Progress + opt.ProgressPenalty);
            state.CurrentProject.ClientMood = Mathf.Clamp(state.CurrentProject.ClientMood + opt.ClientMoodDelta, 0, 100);
        }

        if (!string.IsNullOrEmpty(opt.Outcome))
            GameManager.Instance.AddLog($"✅ {opt.Outcome}");
    }

    public GameEventDefinition[] GetAll() => _allEvents;
}
