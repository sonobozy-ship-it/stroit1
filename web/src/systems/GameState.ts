// ─────────────────────────────────────────────────────────
// Enums

export enum ProjectPhase {
  Procurement = 'Procurement',
  Construction = 'Construction',
  Finishing = 'Finishing',
  Documents = 'Documents',
  SigningKS2 = 'SigningKS2',
  WaitingPayment = 'WaitingPayment',
  Completed = 'Completed',
}

export enum PaymentOutcome {
  Unknown = 'Unknown',
  Full = 'Full',         // 100% — клиент доволен
  Partial = 'Partial',   // 50–85% — «нашли нарушения в смете»
  Delayed = 'Delayed',   // платит, но сдвигает срок ещё раз (госка)
  Disappeared = 'Disappeared', // исчез. Аванс остался, остаток потерян.
}

export enum LoanType {
  Bank = 'Bank',           // 15% fee, 7-day repay — manageable
  QuickMoney = 'QuickMoney', // 40% fee, 3-day repay — painful
  LoanShark = 'LoanShark',  // 80% fee, 2-day repay — toxic, можно потерять технику
  FriendLoan = 'FriendLoan', // 0% fee — requires high Connections
}

// ─────────────────────────────────────────────────────────
// Project

export interface ProjectState {
  contractId: string;
  name: string;
  client: string;
  clientId: string;       // used for ClientRelations lookup
  clientType: string;
  emoji: string;

  contractValue: number;
  advancePaid: number;
  extraRevenue: number;
  accruedPenalties: number;

  progress: number;
  phase: ProjectPhase;
  phaseProgress: number;

  clientMood: number;
  startDay: number;
  deadlineDay: number;
  eventMultiplier: number;

  // Documents
  documentsReady: boolean;
  documentRejections: number;
  documentMaxIterations: number;
  rejectionReasons: string[];

  // Payment
  ks2Signed: boolean;
  paymentOutcomeRolled: PaymentOutcome;
  overdueDays: number;       // days past deadline
  clientAbandoned: boolean;  // social humiliation flag
}

export function createProjectState(overrides: Partial<ProjectState> = {}): ProjectState {
  return {
    contractId: '',
    name: '',
    client: '',
    clientId: '',
    clientType: '',
    emoji: '',
    contractValue: 0,
    advancePaid: 0,
    extraRevenue: 0,
    accruedPenalties: 0,
    progress: 0,
    phase: ProjectPhase.Procurement,
    phaseProgress: 0,
    clientMood: 50,
    startDay: 0,
    deadlineDay: 0,
    eventMultiplier: 1,
    documentsReady: false,
    documentRejections: 0,
    documentMaxIterations: 3,
    rejectionReasons: [],
    ks2Signed: false,
    paymentOutcomeRolled: PaymentOutcome.Unknown,
    overdueDays: 0,
    clientAbandoned: false,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────
// Workers

export interface HiredWorkerState {
  workerId: string;
  name: string;
  emoji: string;
  efficiency: number;
  dailyCost: number;
  drinkRisk: number;
  leaveRisk: number;
  quality: number;
  reliability: number;
  isForeman: boolean; // высокий DrinkRisk бонус, но может воровать

  isOnBinge: boolean;
  bingeTicksLeft: number;
  isOnAnotherSite: boolean;
  anotherSiteTicksLeft: number;

  totalStolenAmount: number; // статистика — сколько украл
}

// ─────────────────────────────────────────────────────────
// Events

export interface ActiveEventState {
  eventId: string;
  instanceId: string;
  title: string;
  description: string;
  emoji: string;
  ticksLeft: number;
  autoResolveOptionIndex: number;
  options: EventOptionState[];
  isUrgent: boolean;
}

export interface EventOptionState {
  label: string;
  cost: number;
  progressPenalty: number;
  stressDelta: number;
  reputationDelta: number;
  clientMoodDelta: number;
  connectionsCost: number;
  requiresRewardedAd: boolean;
  outcome: string;
}

// ─────────────────────────────────────────────────────────
// Payments

export interface PendingPayment {
  projectName: string;
  client: string;
  amount: number;
  arrivalTick: number;
  arrivalTickOriginal: number;
  outcome: PaymentOutcome; // revealed when payment arrives
  outcomeRevealed: boolean;
}

// ─────────────────────────────────────────────────────────
// Loans

export interface ActiveLoan {
  id: string;
  lenderName: string;
  type: LoanType;
  principalAmount: number;
  totalOwed: number;    // principal + interest
  dailyInterest: number;
  dueTick: number;      // when it must be repaid
  isOverdue: boolean;
}

// ─────────────────────────────────────────────────────────
// Client Relations

export interface ClientRelation {
  clientId: string;
  clientName: string;
  clientType: string;
  projectsCompleted: number;
  averageMoodAtClose: number;
  isRegular: boolean;           // 2+ projects with good mood
  isBlacklisted: boolean;       // client abandoned or failed
  paymentSpeedBonus: number;    // ticks reduction per project (stacks)
  advancePercentBonus: number;
}

// ─────────────────────────────────────────────────────────
// Battle Pass

export interface BattlePassState {
  season: number;
  xp: number;
  level: number;           // 0–50
  isPremium: boolean;
  claimedFreeRewards: Set<number>;
  claimedPremiumRewards: Set<number>;
  weeklyTasks: WeeklyTask[];
  weekStartDay: number;
}

export function createBattlePassState(): BattlePassState {
  return {
    season: 1,
    xp: 0,
    level: 0,
    isPremium: false,
    claimedFreeRewards: new Set(),
    claimedPremiumRewards: new Set(),
    weeklyTasks: [],
    weekStartDay: 0,
  };
}

export interface WeeklyTask {
  id: string;
  description: string;
  targetCount: number;
  currentCount: number;
  xpReward: number;
  // isCompleted is a getter equivalent: currentCount >= targetCount
}

export function isTaskCompleted(task: WeeklyTask): boolean {
  return task.currentCount >= task.targetCount;
}

// ─────────────────────────────────────────────────────────
// Records

export interface CompletedProjectRecord {
  name: string;
  client: string;
  clientId: string;
  emoji: string;
  earned: number;
  completedDay: number;
  finalClientMood: number;
  documentRejections: number;
  outcome: PaymentOutcome;
}

export interface LogEntry {
  message: string;
  tick: number;
}

// ─────────────────────────────────────────────────────────
// Root GameState

export interface GameState {
  // Economy
  money: number;
  totalEarned: number;
  connections: number;

  // Meters (0–100)
  stress: number;
  reputation: number;

  // Time
  day: number;
  tick: number;

  // Projects
  currentProject: ProjectState | null;
  completedProjects: CompletedProjectRecord[];

  // Workers
  hiredWorkers: HiredWorkerState[];

  // Events
  activeEvents: ActiveEventState[];

  // Client relations
  clientRelations: Map<string, ClientRelation>;

  // Active loans
  activeLoans: ActiveLoan[];

  // Progression
  companyLevel: number;
  companyName: string;
  unlockedContractIds: Set<string>;
  unlockedWorkerIds: Set<string>;
  purchasedUpgrades: Set<string>;

  // Battle Pass
  battlePass: BattlePassState;

  // Log
  log: LogEntry[];

  // State
  isGameOver: boolean;
  totalDaysPlayed: number;

  // Pending payments (retention hook)
  pendingPayments: PendingPayment[];
}

export function createGameState(): GameState {
  return {
    money: 50_000,
    totalEarned: 0,
    connections: 0,
    stress: 0,
    reputation: 50,
    day: 1,
    tick: 0,
    currentProject: null,
    completedProjects: [],
    hiredWorkers: [],
    activeEvents: [],
    clientRelations: new Map(),
    activeLoans: [],
    companyLevel: 1,
    companyName: 'ИП Строй-Мастер',
    unlockedContractIds: new Set(['kvartira_ekonom']),
    unlockedWorkerIds: new Set(['vasya']),
    purchasedUpgrades: new Set(),
    battlePass: createBattlePassState(),
    log: [],
    isGameOver: false,
    totalDaysPlayed: 0,
    pendingPayments: [],
  };
}

// ─────────────────────────────────────────────────────────
// Definition interfaces (referenced by systems, filled from data files)

export interface WorkerDefinition {
  id: string;
  workerName: string;
  emoji: string;
  role: string;
  efficiency: number;
  dailyCost: number;
  hireCost: number;
  drinkRisk: number;
  leaveRisk: number;
  quality: number;
  reliability: number;
  isForeman: boolean;
  requiredCompanyLevel: number;
  requiredReputation: number;
}

export interface ContractDefinition {
  id: string;
  contractName: string;
  client: string;
  clientId: string;
  clientType: string;
  emoji: string;
  contractValue: number;
  advancePercent: number;
  materialsCost: number;
  durationDays: number;
  clientMoodStart: number;
  eventMultiplier: number;
  documentIterationsMin: number;
  documentIterationsMax: number;
  requiredCompanyLevel: number;
  requiredReputation: number;
}

export interface UpgradeDefinition {
  id: string;
  upgradeName: string;
  description: string;
  moneyCost: number;
  connectionsCost: number;
  requiredCompanyLevel: number;
  requiredReputation: number;
  requiredUpgrades: string[];
  unlocksContracts: string[];
  unlocksWorkers: string[];
}

export interface GameEventDefinition {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: EventCategory;
  autoResolveAfterTicks: number;
  autoResolveOptionIndex: number;
  isUrgent: boolean;
  isLiveOpsEvent: boolean;
  requiresActiveProject: boolean;
  options: EventOptionDefinition[];
}

export enum EventCategory {
  Workers = 'Workers',
  Client = 'Client',
  Finance = 'Finance',
  Regulatory = 'Regulatory',
  General = 'General',
}

export interface EventOptionDefinition {
  label: string;
  cost: number;
  progressPenalty: number;
  stressDelta: number;
  reputationDelta: number;
  clientMoodDelta: number;
  connectionsCost: number;
  requiresRewardedAd: boolean;
  outcome: string;
}

export interface LiveOpsEventDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  materialCostMod: number;
  workerCostMod: number;
  eventMultiplierMod: number;
  buildSpeedMod: number;
  documentIterationsMod: number;
  goszakazAdvanceBonus: number;
  battlePassXpMod: number;
}
