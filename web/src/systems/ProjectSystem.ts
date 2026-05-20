import {
  GameState,
  ProjectState,
  ProjectPhase,
  PaymentOutcome,
  PendingPayment,
  CompletedProjectRecord,
  ContractDefinition,
  createProjectState,
} from './GameState';

// Default remote-config values (can be overridden at runtime)
export interface ProjectSystemConfig {
  stressOverduePerTick: number;
  normalPaymentMin: number;
  normalPaymentMax: number;
  toxicPaymentMin: number;
  toxicPaymentMax: number;
  genpodradPaymentMin: number;
  genpodradPaymentMax: number;
  goszakazPaymentMin: number;
  goszakazPaymentMax: number;
}

const DEFAULT_CONFIG: ProjectSystemConfig = {
  stressOverduePerTick: 1,
  normalPaymentMin: 30,
  normalPaymentMax: 120,
  toxicPaymentMin: 60,
  toxicPaymentMax: 300,
  genpodradPaymentMin: 90,
  genpodradPaymentMax: 360,
  goszakazPaymentMin: 180,
  goszakazPaymentMax: 720,
};

export class ProjectSystem {
  private readonly _allContracts: ContractDefinition[];
  private readonly _cfg: ProjectSystemConfig;

  constructor(allContracts: ContractDefinition[] = [], config: Partial<ProjectSystemConfig> = {}) {
    this._allContracts = allContracts;
    this._cfg = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────
  processTick(
    state: GameState,
    addLog: (msg: string) => void,
    rollPaymentOutcome: (project: ProjectState, state: GameState) => PaymentOutcome,
    getPaymentSpeedBonus: (clientId: string, state: GameState) => number,
    onFinalizeProject: (state: GameState, addLog: (msg: string) => void) => void,
  ): void {
    const p = state.currentProject;
    if (p === null || p.phase === ProjectPhase.Completed) return;

    switch (p.phase) {
      case ProjectPhase.Procurement:
        this.processProcurement(p, addLog);
        break;
      case ProjectPhase.Construction:
      case ProjectPhase.Finishing:
        this.processBuilding(p, state, addLog);
        break;
      case ProjectPhase.Documents:
        // Documents are player-triggered, just add deadline pressure
        this.addDeadlinePressure(p, state, addLog, onFinalizeProject);
        break;
      case ProjectPhase.WaitingPayment:
        // Payment handled in FinanceSystem
        break;
    }

    // Deadline pressure (common to all phases)
    const daysLeft = p.deadlineDay - state.day;
    if (daysLeft <= 3 && daysLeft > 0) {
      state.stress = Math.min(100, state.stress + 0.5);
      if (state.tick % 30 === 0)
        addLog(`⏰ ${p.client} звонит каждый час. До дедлайна ${daysLeft} дн.`);
    } else if (daysLeft < 0) {
      state.stress = Math.min(100, state.stress + 1);
      p.accruedPenalties += this.calculateDailyPenalty(p);
      if (state.tick % 30 === 0)
        addLog(`💸 Просрочка. Штраф за сегодня: ${this.calculateDailyPenalty(p).toLocaleString('ru')} ₽.`);
    }
  }

  private processProcurement(p: ProjectState, addLog: (msg: string) => void): void {
    p.phaseProgress += 5;
    if (p.phaseProgress >= 100) {
      p.phase = ProjectPhase.Construction;
      p.phaseProgress = 0;
      addLog(`🚚 Материалы доставлены. Бригада выезжает на ${p.name}.`);
    }
  }

  private processBuilding(
    p: ProjectState,
    state: GameState,
    addLog: (msg: string) => void,
  ): void {
    const activeWorkers = state.hiredWorkers.filter(w => !w.isOnBinge && !w.isOnAnotherSite);
    if (activeWorkers.length === 0) return;

    let totalEff = activeWorkers.reduce((sum, w) => sum + w.efficiency, 0);

    // Foreman bonus: reduces inefficiency
    const hasForeman = activeWorkers.some(w => w.isForeman);
    if (hasForeman) totalEff *= 1.2;

    const progressPerTick = totalEff / 50;
    p.progress = Math.min(1, p.progress + progressPerTick);

    // Advance phase (progress is 0–1)
    if (p.phase === ProjectPhase.Construction && p.progress >= 0.7) {
      p.phase = ProjectPhase.Finishing;
      addLog('🏗️ Основные работы завершены. Переходим к отделке.');
    }

    if (p.progress >= 1.0) {
      p.phase = ProjectPhase.Documents;
      p.phaseProgress = 0;
      addLog(`✅ ${p.name} — работы завершены! Собираем ИД...`);
    }
  }

  private addDeadlinePressure(
    p: ProjectState,
    state: GameState,
    addLog: (msg: string) => void,
    onFinalizeProject: (state: GameState, addLog: (msg: string) => void) => void,
  ): void {
    const daysLeft = p.deadlineDay - state.day;
    if (daysLeft >= 0) return;

    p.overdueDays = -daysLeft;
    state.stress = Math.min(100, state.stress + this._cfg.stressOverduePerTick);

    // Social humiliation: client hires another contractor after 5 days overdue
    if (p.overdueDays >= 5 && !p.clientAbandoned && Math.random() < 0.02) {
      this.triggerClientAbandonment(p, state, addLog, onFinalizeProject);
    }
  }

  private triggerClientAbandonment(
    p: ProjectState,
    state: GameState,
    addLog: (msg: string) => void,
    onFinalizeProject: (state: GameState, addLog: (msg: string) => void) => void,
  ): void {
    p.clientAbandoned = true;
    p.phase = ProjectPhase.Completed;

    // Return only partial advance
    const refund = Math.floor(p.advancePaid * 0.3);
    state.money += refund;
    state.reputation = Math.max(0, state.reputation - 20);
    state.stress = Math.min(100, state.stress + 25);

    addLog(
      `💔 ${p.client} устал ждать и нанял другого подрядчика. Возврат аванса: ${refund.toLocaleString('ru')} ₽. Репутация упала.`,
    );
    addLog(
      '📱 В чате прорабов: «Слышали, [ваша компания] кинула заказчика? Не берите их на объекты.»',
    );

    onFinalizeProject(state, addLog);
  }

  private calculateDailyPenalty(p: ProjectState): number {
    // Typical construction contract: 0.1% per day of delay
    return Math.floor(p.contractValue * 0.001);
  }

  // ─────────────────────────────────────────────────────────
  startProject(contractId: string, state: GameState, addLog: (msg: string) => void): void {
    const def = this.getContract(contractId);
    if (def === null) return;

    const advance = Math.floor(def.contractValue * def.advancePercent);

    if (state.money < def.materialsCost) {
      addLog('❌ Недостаточно средств на закупку материалов.');
      return;
    }
    state.money -= def.materialsCost;
    state.money += advance;

    let docIterations =
      Math.floor(Math.random() * (def.documentIterationsMax - def.documentIterationsMin + 1)) +
      def.documentIterationsMin;

    // Document specialist reduces iterations
    const hasDocSpec = state.hiredWorkers.some(w => w.workerId === 'doc_specialist');
    if (hasDocSpec) docIterations = Math.max(1, docIterations - 1);

    state.currentProject = createProjectState({
      contractId,
      name: def.contractName,
      client: def.client,
      clientId: def.clientId,
      clientType: def.clientType,
      emoji: def.emoji,
      contractValue: def.contractValue,
      advancePaid: advance,
      clientMood: def.clientMoodStart,
      startDay: state.day,
      deadlineDay: state.day + def.durationDays,
      eventMultiplier: def.eventMultiplier,
      documentMaxIterations: docIterations,
    });

    addLog(
      `🤝 Контракт подписан: ${def.contractName}. Аванс: ${advance.toLocaleString('ru')} ₽. Дедлайн: день ${state.day + def.durationDays}.`,
    );
  }

  signKS2(
    state: GameState,
    addLog: (msg: string) => void,
    rollPaymentOutcome: (project: ProjectState, state: GameState) => PaymentOutcome,
    getPaymentSpeedBonus: (clientId: string, state: GameState) => number,
  ): void {
    const p = state.currentProject;
    if (p === null || p.phase !== ProjectPhase.SigningKS2) return;

    p.ks2Signed = true;

    // Base amount
    const remaining = p.contractValue - p.advancePaid + p.extraRevenue - p.accruedPenalties;
    const moodMultiplier = 0.6 + (p.clientMood / 100) * (1.0 - 0.6); // lerp(0.6, 1.0, clientMood/100)
    const baseAmount = Math.floor(remaining * moodMultiplier);

    // Roll outcome secretly — revealed on arrival
    const outcome = rollPaymentOutcome(p, state);
    p.paymentOutcomeRolled = outcome;

    // Payment delay (with client relations speed bonus)
    let delayTicks = this.getPaymentDelayTicks(p.clientType);
    const speedBonus = getPaymentSpeedBonus(p.clientId, state);
    delayTicks = Math.max(10, delayTicks - speedBonus);

    const payment: PendingPayment = {
      projectName: p.name,
      client: p.client,
      amount: baseAmount,
      outcome,
      arrivalTick: state.tick + delayTicks,
      arrivalTickOriginal: state.tick + delayTicks,
      outcomeRevealed: false,
    };

    state.pendingPayments.push(payment);
    p.phase = ProjectPhase.WaitingPayment;

    const delayText = this.formatTicks(delayTicks);
    addLog(`📝 КС-2 подписан! Ожидаемая оплата через ${delayText}.`);

    if (p.clientType === 'goszakaz')
      addLog('🏛️ КАЗНАЧЕЙСТВО: принято к рассмотрению. «Ориентировочный срок — в течение квартала».');
  }

  private getPaymentDelayTicks(clientType: string): number {
    switch (clientType) {
      case 'normal':
        return Math.floor(Math.random() * (this._cfg.normalPaymentMax - this._cfg.normalPaymentMin) + this._cfg.normalPaymentMin);
      case 'toxic':
        return Math.floor(Math.random() * (this._cfg.toxicPaymentMax - this._cfg.toxicPaymentMin) + this._cfg.toxicPaymentMin);
      case 'genpodryad':
        return Math.floor(Math.random() * (this._cfg.genpodradPaymentMax - this._cfg.genpodradPaymentMin) + this._cfg.genpodradPaymentMin);
      case 'goszakaz':
        return Math.floor(Math.random() * (this._cfg.goszakazPaymentMax - this._cfg.goszakazPaymentMin) + this._cfg.goszakazPaymentMin);
      default:
        return 60;
    }
  }

  private formatTicks(ticks: number): string {
    if (ticks < 60) return `${ticks} сек`;
    if (ticks < 3600) return `${Math.floor(ticks / 60)} мин`;
    return `${(ticks / 3600).toFixed(1)} ч`;
  }

  finalizeProject(
    state: GameState,
    addLog: (msg: string) => void,
    onRecordCompletion?: (project: ProjectState, state: GameState) => void,
    onRecordAbandonment?: (project: ProjectState, state: GameState) => void,
    onBattlePassProjectCompleted?: (state: GameState, clientMood: number) => void,
    onProgressTaskComplete?: (taskId: string, state: GameState, amount?: number) => void,
    onCheckUnlocks?: (state: GameState) => void,
  ): void {
    const p = state.currentProject;
    if (p === null) return;

    const repDelta = Math.round((p.clientMood - 50) / 10);
    state.reputation = Math.max(0, Math.min(100, state.reputation + repDelta));
    state.stress = Math.max(0, state.stress - 10);

    const record: CompletedProjectRecord = {
      name: p.name,
      client: p.client,
      clientId: p.clientId,
      emoji: p.emoji,
      earned: p.contractValue, // simplified
      completedDay: state.day,
      finalClientMood: p.clientMood,
      documentRejections: p.documentRejections,
      outcome: p.paymentOutcomeRolled,
    };

    state.completedProjects.unshift(record);
    state.currentProject = null;

    // Client relations
    if (!p.clientAbandoned) {
      onRecordCompletion?.(p, state);
    } else {
      onRecordAbandonment?.(p, state);
    }

    // Battle pass
    onBattlePassProjectCompleted?.(state, p.clientMood);
    onProgressTaskComplete?.('complete_projects', state);
    onProgressTaskComplete?.('survive_days', state, state.day - p.startDay);

    // Check progression unlocks
    onCheckUnlocks?.(state);
  }

  getContract(id: string): ContractDefinition | null {
    return this._allContracts.find(c => c.id === id) ?? null;
  }

  getAvailableContracts(state: GameState): ContractDefinition[] {
    return this._allContracts.filter(c =>
      state.unlockedContractIds.has(c.id) &&
      c.requiredCompanyLevel <= state.companyLevel &&
      c.requiredReputation <= state.reputation,
    );
  }
}
