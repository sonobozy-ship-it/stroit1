import {
  GameState,
  ActiveEventState,
  EventOptionState,
  GameEventDefinition,
  EventCategory,
} from './GameState';

export class EventSystem {
  private readonly _allEvents: GameEventDefinition[];
  private static readonly MAX_ACTIVE_EVENTS = 3;

  constructor(allEvents: GameEventDefinition[] = []) {
    this._allEvents = allEvents;
  }

  // ─────────────────────────────────────────────────────────
  processTick(state: GameState, addLog: (msg: string) => void): void {
    // Tick down active events, auto-resolve expired ones
    const expired = state.activeEvents.filter(e => e.ticksLeft <= 0);
    for (const ev of expired) {
      this.autoResolve(ev, state, addLog);
    }
    state.activeEvents = state.activeEvents.filter(e => e.ticksLeft > 0);

    for (const ev of state.activeEvents) {
      ev.ticksLeft--;
    }

    // Try to spawn new events
    if (
      state.activeEvents.length < EventSystem.MAX_ACTIVE_EVENTS &&
      state.currentProject !== null
    ) {
      this.trySpawnEvent(state, addLog);
    }
  }

  private trySpawnEvent(state: GameState, addLog: (msg: string) => void): void {
    const proj = state.currentProject!;
    const baseChance = 0.005 * proj.eventMultiplier;

    if (Math.random() > baseChance) return;

    // Pick eligible event
    const activeIds = new Set(state.activeEvents.map(e => e.eventId));
    const eligible = this._allEvents.filter(ev =>
      !activeIds.has(ev.id) &&
      !ev.isLiveOpsEvent &&
      this.isEventEligible(ev, state),
    );

    if (eligible.length === 0) return;

    const def = eligible[Math.floor(Math.random() * eligible.length)];
    this.spawnEvent(def, state, addLog);
  }

  private isEventEligible(ev: GameEventDefinition, state: GameState): boolean {
    if (ev.requiresActiveProject && state.currentProject === null) return false;

    // Worker events require workers
    if (ev.category === EventCategory.Workers && state.hiredWorkers.length === 0) return false;

    // Client events require a client
    if (ev.category === EventCategory.Client && state.currentProject === null) return false;

    return true;
  }

  spawnEvent(def: GameEventDefinition, state: GameState, addLog: (msg: string) => void): void {
    const instance: ActiveEventState = {
      eventId: def.id,
      instanceId: crypto.randomUUID().replace(/-/g, '').slice(0, 8),
      title: def.title,
      description: def.description,
      emoji: def.emoji,
      ticksLeft: def.autoResolveAfterTicks,
      autoResolveOptionIndex: def.autoResolveOptionIndex,
      isUrgent: def.isUrgent,
      options: def.options.map(o => ({
        label: o.label,
        cost: o.cost,
        progressPenalty: o.progressPenalty,
        stressDelta: o.stressDelta,
        reputationDelta: o.reputationDelta,
        clientMoodDelta: o.clientMoodDelta,
        connectionsCost: o.connectionsCost,
        requiresRewardedAd: o.requiresRewardedAd,
        outcome: o.outcome,
      })),
    };

    state.activeEvents.push(instance);
    state.stress = Math.min(100, state.stress + 3);
    addLog(`⚠️ Новое событие: ${def.title}`);
  }

  resolve(
    instanceId: string,
    optionIndex: number,
    usedRewardedAd: boolean,
    state: GameState,
    addLog: (msg: string) => void,
    onEventResolved?: (state: GameState) => void,
  ): void {
    const ev = state.activeEvents.find(e => e.instanceId === instanceId);
    if (!ev) return;

    const opt = ev.options[optionIndex];

    // Validate connections cost
    if (opt.connectionsCost > state.connections) {
      addLog('❌ Недостаточно Связей.');
      return;
    }

    this.applyOption(opt, state, false, addLog);
    state.activeEvents = state.activeEvents.filter(e => e.instanceId !== instanceId);
    onEventResolved?.(state);
  }

  private autoResolve(
    ev: ActiveEventState,
    state: GameState,
    addLog: (msg: string) => void,
  ): void {
    const opt = ev.options[ev.autoResolveOptionIndex];
    this.applyOption(opt, state, true, addLog);
    addLog(`⏱️ «${ev.title}» разрешилось само — не в вашу пользу.`);
  }

  private applyOption(
    opt: EventOptionState,
    state: GameState,
    isAuto: boolean,
    addLog: (msg: string) => void,
  ): void {
    const stressExtra = isAuto ? 5 : 0;

    state.money -= opt.cost;
    state.connections -= opt.connectionsCost;
    state.stress = Math.max(0, Math.min(100, state.stress + opt.stressDelta + stressExtra));
    state.reputation = Math.max(0, Math.min(100, state.reputation + opt.reputationDelta));

    if (state.currentProject !== null) {
      state.currentProject.progress = Math.max(
        0,
        state.currentProject.progress + opt.progressPenalty,
      );
      state.currentProject.clientMood = Math.max(
        0,
        Math.min(100, state.currentProject.clientMood + opt.clientMoodDelta),
      );
    }

    if (opt.outcome) addLog(`✅ ${opt.outcome}`);
  }

  getAll(): GameEventDefinition[] {
    return this._allEvents;
  }
}
