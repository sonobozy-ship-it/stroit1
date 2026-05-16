import { GameState, WeeklyTask } from './GameState';

export interface BattlePassReward {
  level: number;
  isPremium: boolean;
  money: number;
  connections: number;
  workerId: string;
  contractId: string;
  description: string;
}

/**
 * Battle Pass — weekly season with 50 levels, free + premium track.
 * XP earned from: completing projects, resolving events, hiring workers, doc submissions.
 * Reset weekly (every SEASON_DAYS game-days).
 */
export class BattlePassSystem {
  private static readonly MAX_LEVEL = 50;
  private static readonly XP_PER_LEVEL = 100;
  private static readonly SEASON_DAYS = 7;

  // ─────────────────────────────────────────────────────────
  /** Called each tick to check for season reset. */
  processTick(state: GameState, addLog: (msg: string) => void): void {
    const bp = state.battlePass;
    if (bp.weekStartDay === 0) bp.weekStartDay = state.day;
    if (state.day >= bp.weekStartDay + BattlePassSystem.SEASON_DAYS) {
      this.startNewSeason(state, addLog);
    }
  }

  // ─────────────────────────────────────────────────────────
  // XP

  addXp(
    amount: number,
    state: GameState,
    addLog: (msg: string) => void,
    liveOpsXpMod = 1,
  ): void {
    const bp = state.battlePass;
    if (bp.level >= BattlePassSystem.MAX_LEVEL) return;

    const finalAmount = Math.round(amount * liveOpsXpMod);
    const prevLevel = bp.level;

    bp.xp += finalAmount;

    while (bp.xp >= BattlePassSystem.XP_PER_LEVEL && bp.level < BattlePassSystem.MAX_LEVEL) {
      bp.xp -= BattlePassSystem.XP_PER_LEVEL;
      bp.level++;
    }

    if (bp.level > prevLevel)
      addLog(`🏆 Боевой пропуск: уровень ${bp.level}! Забирай награду.`);
  }

  // XP sources — call these from the relevant systems
  onProjectCompleted(
    state: GameState,
    clientMood: number,
    addLog: (msg: string) => void,
    liveOpsXpMod = 1,
  ): void {
    const xp = clientMood >= 70 ? 30 : clientMood >= 50 ? 20 : 10;
    this.addXp(xp, state, addLog, liveOpsXpMod);
  }

  onEventResolved(state: GameState, addLog: (msg: string) => void, liveOpsXpMod = 1): void {
    this.addXp(5, state, addLog, liveOpsXpMod);
  }

  onDocumentAccepted(
    state: GameState,
    rejections: number,
    addLog: (msg: string) => void,
    liveOpsXpMod = 1,
  ): void {
    const xp = rejections === 0 ? 15 : rejections === 1 ? 10 : 5;
    this.addXp(xp, state, addLog, liveOpsXpMod);
  }

  onWorkerHired(state: GameState, addLog: (msg: string) => void, liveOpsXpMod = 1): void {
    this.addXp(3, state, addLog, liveOpsXpMod);
  }

  onLoanRepaid(state: GameState, addLog: (msg: string) => void, liveOpsXpMod = 1): void {
    this.addXp(8, state, addLog, liveOpsXpMod);
  }

  // ─────────────────────────────────────────────────────────
  // Rewards

  getReward(level: number, premium: boolean): BattlePassReward | undefined {
    return premium
      ? BattlePassSystem.PREMIUM_REWARDS.get(level)
      : BattlePassSystem.FREE_REWARDS.get(level);
  }

  claimFreeReward(level: number, state: GameState, addLog: (msg: string) => void): boolean {
    const bp = state.battlePass;
    if (bp.level < level || bp.claimedFreeRewards.has(level)) return false;

    const reward = BattlePassSystem.FREE_REWARDS.get(level);
    if (!reward) return false;

    this.applyReward(reward, state);
    bp.claimedFreeRewards.add(level);
    addLog(`🎁 Награда БП уровень ${level}: ${reward.description}`);
    return true;
  }

  claimPremiumReward(level: number, state: GameState, addLog: (msg: string) => void): boolean {
    const bp = state.battlePass;
    if (!bp.isPremium || bp.level < level || bp.claimedPremiumRewards.has(level)) return false;

    const reward = BattlePassSystem.PREMIUM_REWARDS.get(level);
    if (!reward) return false;

    this.applyReward(reward, state);
    bp.claimedPremiumRewards.add(level);
    addLog(`⭐ Премиум-награда уровень ${level}: ${reward.description}`);
    return true;
  }

  private applyReward(reward: BattlePassReward, state: GameState): void {
    state.money += reward.money;
    state.connections += reward.connections;
    if (reward.workerId) state.unlockedWorkerIds.add(reward.workerId);
    if (reward.contractId) state.unlockedContractIds.add(reward.contractId);
  }

  unlockPremium(state: GameState, addLog: (msg: string) => void): void {
    state.battlePass.isPremium = true;
    addLog('⭐ Боевой пропуск активирован. Все премиум-награды разблокированы.');
  }

  // ─────────────────────────────────────────────────────────
  // Weekly tasks

  private startNewSeason(state: GameState, addLog: (msg: string) => void): void {
    const bp = state.battlePass;
    bp.season++;
    bp.xp = 0;
    bp.level = 0;
    bp.isPremium = false;
    bp.claimedFreeRewards.clear();
    bp.claimedPremiumRewards.clear();
    bp.weeklyTasks = this.generateWeeklyTasks(bp.season);
    bp.weekStartDay = state.day;
    addLog(`📅 Новый сезон боевого пропуска #${bp.season}. Новые задачи!`);
  }

  private generateWeeklyTasks(_season: number): WeeklyTask[] {
    return [
      { id: 'complete_projects', description: 'Закрыть 3 объекта',                     targetCount: 3,  currentCount: 0, xpReward: 50 },
      { id: 'resolve_events',    description: 'Разрешить 10 событий',                   targetCount: 10, currentCount: 0, xpReward: 30 },
      { id: 'submit_docs',       description: 'Сдать ИД 5 раз',                         targetCount: 5,  currentCount: 0, xpReward: 40 },
      { id: 'hire_workers',      description: 'Нанять 2 рабочих',                       targetCount: 2,  currentCount: 0, xpReward: 20 },
      { id: 'survive_days',      description: 'Продержаться 7 дней без банкротства',    targetCount: 7,  currentCount: 0, xpReward: 60 },
    ];
  }

  progressTask(taskId: string, state: GameState, amount = 1, addLog?: (msg: string) => void): void {
    const task = state.battlePass.weeklyTasks?.find(t => t.id === taskId);
    if (!task || task.currentCount >= task.targetCount) return;

    task.currentCount = Math.min(task.targetCount, task.currentCount + amount);
    if (task.currentCount >= task.targetCount) {
      if (addLog) addLog(`✅ Задача выполнена: ${task.description} (+${task.xpReward} XP)`);
      // XP reward applied separately via addXp to avoid circular refs
    }
  }

  // ─────────────────────────────────────────────────────────
  // Reward tables

  private static readonly FREE_REWARDS = new Map<number, BattlePassReward>([
    [1,  { level: 1,  isPremium: false, money: 10_000,  connections: 0,   workerId: '',               contractId: '',               description: '+10 000 ₽' }],
    [5,  { level: 5,  isPremium: false, money: 0,       connections: 10,  workerId: '',               contractId: '',               description: '+10 Связей' }],
    [10, { level: 10, isPremium: false, money: 50_000,  connections: 0,   workerId: '',               contractId: '',               description: '+50 000 ₽' }],
    [15, { level: 15, isPremium: false, money: 0,       connections: 25,  workerId: '',               contractId: '',               description: '+25 Связей' }],
    [20, { level: 20, isPremium: false, money: 0,       connections: 0,   workerId: 'akhmed',         contractId: '',               description: 'Ахмед разблокирован' }],
    [25, { level: 25, isPremium: false, money: 150_000, connections: 0,   workerId: '',               contractId: '',               description: '+150 000 ₽' }],
    [30, { level: 30, isPremium: false, money: 0,       connections: 50,  workerId: '',               contractId: '',               description: '+50 Связей' }],
    [40, { level: 40, isPremium: false, money: 300_000, connections: 0,   workerId: '',               contractId: '',               description: '+300 000 ₽' }],
    [50, { level: 50, isPremium: false, money: 0,       connections: 100, workerId: '',               contractId: 'goszakaz_premium', description: 'Госконтракт + 100 Связей' }],
  ]);

  private static readonly PREMIUM_REWARDS = new Map<number, BattlePassReward>([
    [1,  { level: 1,  isPremium: true, money: 0,       connections: 20,  workerId: '',                  contractId: '',                 description: '+20 Связей' }],
    [5,  { level: 5,  isPremium: true, money: 30_000,  connections: 0,   workerId: '',                  contractId: '',                 description: '+30 000 ₽' }],
    [10, { level: 10, isPremium: true, money: 0,       connections: 0,   workerId: 'kolya_welder',      contractId: '',                 description: 'Коля-Сварщик разблокирован' }],
    [15, { level: 15, isPremium: true, money: 0,       connections: 50,  workerId: '',                  contractId: '',                 description: '+50 Связей' }],
    [20, { level: 20, isPremium: true, money: 200_000, connections: 0,   workerId: '',                  contractId: '',                 description: '+200 000 ₽' }],
    [25, { level: 25, isPremium: true, money: 0,       connections: 0,   workerId: 'fedya_electrician', contractId: '',                 description: 'Дядя Федя разблокирован' }],
    [30, { level: 30, isPremium: true, money: 0,       connections: 100, workerId: '',                  contractId: '',                 description: '+100 Связей' }],
    [40, { level: 40, isPremium: true, money: 500_000, connections: 0,   workerId: '',                  contractId: '',                 description: '+500 000 ₽' }],
    [50, { level: 50, isPremium: true, money: 0,       connections: 200, workerId: 'sasha_foreman',     contractId: 'nightmare_goszakaz', description: 'Сашок-Прораб + VIP контракт' }],
  ]);
}
