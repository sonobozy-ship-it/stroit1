import { GameState, ActiveEventState, HiredWorkerState } from './GameState';

/**
 * Foreman theft mechanic.
 * Foremen (Прорабы) have a low but non-zero chance to embezzle material money
 * by writing off purchases that never happened.
 * Player can: ignore, audit receipts (chance-based catch), or install CRM (upgrade).
 */
export class ForemanTheftSystem {
  private static readonly BASE_THEFT_CHANCE_PER_DAY = 0.08; // 8% per day per foreman
  private static readonly CRM_THEFT_REDUCTION = 0.7;         // CRM upgrade reduces chance by 70%
  private static readonly ACCOUNTANT_THEFT_REDUCTION = 0.5;  // having an accountant helps

  // ─────────────────────────────────────────────────────────
  /** Call once per day from the day-change handler. */
  processTick(state: GameState, addLog: (msg: string) => void): void {
    if (state.currentProject === null) return;

    const foremen = state.hiredWorkers.filter(w => w.isForeman && !w.isOnBinge);
    if (foremen.length === 0) return;

    const hasCrm = state.purchasedUpgrades.has('crm');
    const hasAccountant = state.purchasedUpgrades.has('accountant');

    for (const foreman of foremen) {
      // Petrovitch is less likely to steal (reputation mechanic)
      let chanceMultiplier = foreman.workerId === 'petrovich_foreman' ? 0.5 : 1;
      if (hasCrm) chanceMultiplier *= 1 - ForemanTheftSystem.CRM_THEFT_REDUCTION;
      if (hasAccountant) chanceMultiplier *= 1 - ForemanTheftSystem.ACCOUNTANT_THEFT_REDUCTION;

      const chance = ForemanTheftSystem.BASE_THEFT_CHANCE_PER_DAY * chanceMultiplier;
      if (Math.random() > chance) continue;

      const project = state.currentProject;
      let stolenAmount = Math.floor(
        project.contractValue * (Math.random() * (0.04 - 0.01) + 0.01),
      );
      stolenAmount = Math.max(5000, stolenAmount); // minimum steal

      // Theft happens silently — money disappears as "materials expense"
      state.money -= stolenAmount;
      foreman.totalStolenAmount += stolenAmount;

      // Spawn an event so player can investigate
      this.spawnTheftEvent(foreman, stolenAmount, state, addLog, hasAccountant);
    }
  }

  private spawnTheftEvent(
    foreman: HiredWorkerState,
    amount: number,
    state: GameState,
    addLog: (msg: string) => void,
    hasAccountant: boolean,
  ): void {
    if (state.activeEvents.length >= 3) return; // don't spam

    const catchChance = hasAccountant ? 0.7 : 0.4;
    const caught = Math.random() < catchChance;

    const ev: ActiveEventState = {
      eventId: 'foreman_theft',
      instanceId: crypto.randomUUID().replace(/-/g, '').slice(0, 8),
      title: `${foreman.name} «потерял» деньги на материалах`,
      description:
        `Накладные на ${amount.toLocaleString('ru')} ₽ есть, а материалов нет. ` +
        `${foreman.name} говорит: «Поставщик подвёл». Верить?`,
      emoji: '💼',
      ticksLeft: 120,
      autoResolveOptionIndex: 0, // ignore by default
      isUrgent: false,
      options: [
        {
          label: 'Поверить. Бывает.',
          cost: 0,
          progressPenalty: 0,
          stressDelta: 5,
          reputationDelta: 0,
          clientMoodDelta: 0,
          connectionsCost: 0,
          requiresRewardedAd: false,
          outcome: `${foreman.name} благодарен. И больше не боится.`,
        },
        {
          label: `Проверить накладные (${Math.floor(catchChance * 100)}% поймать)`,
          cost: 0,
          progressPenalty: 0,
          stressDelta: -5, // relief if caught
          reputationDelta: 5,
          clientMoodDelta: 0,
          connectionsCost: 0,
          requiresRewardedAd: false,
          outcome: caught
            ? `Поймали! ${foreman.name} вернул ${Math.floor(amount * 0.7).toLocaleString('ru')} ₽ и уволен.`
            : `Накладные в порядке. Наверное. ${foreman.name} смотрит невинно.`,
        },
        {
          label: 'Уволить немедленно',
          cost: 0,
          progressPenalty: 0,
          stressDelta: 10,
          reputationDelta: -3, // теряем прораба, темп падает
          clientMoodDelta: -5,
          connectionsCost: 0,
          requiresRewardedAd: false,
          outcome: `${foreman.name} уволен. Объект без прораба — темп упадёт.`,
        },
      ],
    };

    state.activeEvents.push(ev);
    addLog(
      `🤨 Расхождение в накладных на ${amount.toLocaleString('ru')} ₽. ${foreman.name} объясняет...`,
    );
  }

  /**
   * Called when the audit option is chosen on a theft event.
   */
  handleTheftAuditResult(
    foremanId: string,
    stolenAmount: number,
    caught: boolean,
    state: GameState,
    addLog: (msg: string) => void,
    onFire: (workerId: string, state: GameState, addLog: (msg: string) => void) => void,
  ): void {
    if (caught) {
      const recovered = Math.floor(stolenAmount * 0.7);
      state.money += recovered;
      onFire(foremanId, state, addLog);
      state.reputation = Math.min(100, state.reputation + 5);
      addLog(`💰 Вернули ${recovered.toLocaleString('ru')} ₽. ${foremanId} уволен с позором.`);
    } else {
      addLog('🤷 Не смогли доказать. Работает дальше.');
    }
  }
}
