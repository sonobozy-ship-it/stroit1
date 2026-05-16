import { GameState, createGameState } from './GameState';
import {
  FinanceSystem,
  WorkerSystem,
  ProjectSystem,
  DocumentSystem,
  EventSystem,
  ClientRelationsSystem,
  ProgressionSystem,
  ForemanTheftSystem,
  BattlePassSystem,
  SaveSystem,
} from './index';

/**
 * Central coordinator. Owns GameState, drives the tick loop,
 * and exposes the public API that UI calls into.
 *
 * Tick interval: 3 000 ms real-time = 1 game day.
 */
export class GameManager {
  static instance: GameManager;

  /** Subscribers are called with the latest GameState after every mutation. */
  static onStateChanged: ((state: GameState) => void)[] = [];
  /** Fired once when stress reaches 100. */
  static onGameOver: (() => void)[] = [];

  readonly state: GameState;

  // Systems
  readonly finance: FinanceSystem;
  readonly workers: WorkerSystem;
  readonly projects: ProjectSystem;
  readonly documents: DocumentSystem;
  readonly events: EventSystem;
  readonly clientRelations: ClientRelationsSystem;
  readonly progression: ProgressionSystem;
  readonly foremanTheft: ForemanTheftSystem;
  readonly battlePass: BattlePassSystem;
  readonly save: SaveSystem;

  private static readonly TICK_INTERVAL_MS = 3_000;
  private _tickTimer: ReturnType<typeof setInterval> | null = null;
  private _autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  // ─────────────────────────────────────────────────────────
  constructor() {
    GameManager.instance = this;

    this.save = new SaveSystem();
    this.state = this.save.load();

    this.finance = new FinanceSystem();
    this.workers = new WorkerSystem();
    this.projects = new ProjectSystem();
    this.documents = new DocumentSystem();
    this.events = new EventSystem();
    this.clientRelations = new ClientRelationsSystem();
    this.progression = new ProgressionSystem();
    this.foremanTheft = new ForemanTheftSystem();
    this.battlePass = new BattlePassSystem();
  }

  // ─────────────────────────────────────────────────────────
  /** Begin the tick loop and auto-save. */
  start(): void {
    if (this._tickTimer !== null) return; // already running

    this._tickTimer = setInterval(() => {
      this.processTick();
    }, GameManager.TICK_INTERVAL_MS);

    this._autoSaveTimer = setInterval(() => {
      this.save.save(this.state);
    }, 30_000);
  }

  /** Stop the tick loop and auto-save. */
  stop(): void {
    if (this._tickTimer !== null) {
      clearInterval(this._tickTimer);
      this._tickTimer = null;
    }
    if (this._autoSaveTimer !== null) {
      clearInterval(this._autoSaveTimer);
      this._autoSaveTimer = null;
    }
    this.save.save(this.state);
  }

  // ─────────────────────────────────────────────────────────
  processTick(): void {
    if (this.state.isGameOver) return;

    const prevDay = this.state.day;
    this.state.tick++;
    // Each tick IS one game day (tick interval = 3 s = 1 day)
    this.state.day = this.state.tick;

    if (this.state.day !== prevDay) {
      this.state.totalDaysPlayed++;
      this.finance.processDailyCosts(this.state, (msg) => this.addLog(msg));
    }

    this.finance.processPendingPayments(
      this.state,
      (msg) => this.addLog(msg),
      (s) => this.projects.finalizeProject(s, (msg) => this.addLog(msg)),
    );

    this.workers.processTick(this.state, (msg) => this.addLog(msg));

    if (this.state.currentProject !== null) {
      this.projects.processTick(this.state, (msg) => this.addLog(msg));
    }

    this.events.processTick(this.state, (msg) => this.addLog(msg));
    this.foremanTheft.processTick(this.state, (msg) => this.addLog(msg));

    this.checkGameOver();
    this.notify();
  }

  // ─────────────────────────────────────────────────────────
  // Public action API — all UI interactions go through these.

  hireWorker(workerId: string): void {
    this.workers.hire(workerId, this.state, (msg) => this.addLog(msg));
    this.notify();
  }

  fireWorker(workerId: string): void {
    this.workers.fire(workerId, this.state, (msg) => this.addLog(msg));
    this.notify();
  }

  takeContract(contractId: string): void {
    if (this.state.currentProject !== null) return;
    this.projects.startProject(contractId, this.state, (msg) => this.addLog(msg));
    this.notify();
  }

  resolveEvent(instanceId: string, optionIndex: number, usedAd = false): void {
    this.events.resolve(instanceId, optionIndex, usedAd, this.state, (msg) => this.addLog(msg));
    this.notify();
  }

  submitDocuments(): void {
    this.documents.submit(this.state, (msg) => this.addLog(msg));
    this.notify();
  }

  signKS2(): void {
    this.projects.signKS2(this.state, (msg) => this.addLog(msg));
    this.notify();
  }

  useConnections(purpose: string): void {
    this.progression.spendConnections(purpose, this.state, (msg) => this.addLog(msg));
    this.notify();
  }

  speedUpPayment(usedRewardedAd: boolean): void {
    this.finance.speedUpPendingPayment(usedRewardedAd, this.state, (msg) => this.addLog(msg));
    this.notify();
  }

  // ─────────────────────────────────────────────────────────
  addLog(message: string): void {
    this.state.log.unshift({ message, tick: this.state.tick });
    if (this.state.log.length > 60) {
      this.state.log.length = 60;
    }
  }

  // ─────────────────────────────────────────────────────────
  private checkGameOver(): void {
    if (this.state.stress >= 100) {
      this.state.isGameOver = true;
      this.addLog(
        '💀 Нервный срыв. Вы бросили стройку и открыли шаурмячную. Говорят, там лучше.'
      );
      GameManager.onGameOver.forEach((cb) => cb());
    }
  }

  private notify(): void {
    const s = this.state;
    GameManager.onStateChanged.forEach((cb) => cb(s));
    this.save.save(s);
  }
}
