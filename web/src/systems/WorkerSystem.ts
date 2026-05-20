import {
  GameState,
  HiredWorkerState,
  WorkerDefinition,
} from './GameState';

export class WorkerSystem {
  private readonly _allWorkers: WorkerDefinition[];

  constructor(allWorkers: WorkerDefinition[] = []) {
    this._allWorkers = allWorkers;
  }

  // ─────────────────────────────────────────────────────────
  processTick(state: GameState, addLog: (msg: string) => void): void {
    for (const w of state.hiredWorkers) {
      // Binge recovery
      if (w.isOnBinge) {
        w.bingeTicksLeft--;
        if (w.bingeTicksLeft <= 0) {
          w.isOnBinge = false;
          addLog(`✅ ${w.name} вернулся на объект. Стыдно, но живой.`);
        }
        continue;
      }

      // Away on another site recovery
      if (w.isOnAnotherSite) {
        w.anotherSiteTicksLeft--;
        if (w.anotherSiteTicksLeft <= 0) {
          w.isOnAnotherSite = false;
          addLog(`👷 ${w.name} вернулся. Говорит, там платили хуже.`);
        }
        continue;
      }

      if (state.currentProject === null) continue;

      // Random binge
      const drinkChance = w.drinkRisk * this.getForemenDrinkBonus(state);
      if (Math.random() < drinkChance) {
        w.isOnBinge = true;
        w.bingeTicksLeft = Math.floor(Math.random() * (180 - 60) + 60);
        state.stress = Math.min(100, state.stress + 5);
        addLog(`🍺 ${w.name} ушёл в запой. Недоступен ${w.bingeTicksLeft} сек.`);
        continue;
      }

      // Random leave to another site
      if (Math.random() < w.leaveRisk) {
        w.isOnAnotherSite = true;
        w.anotherSiteTicksLeft = Math.floor(Math.random() * (240 - 90) + 90);
        state.stress = Math.min(100, state.stress + 3);
        addLog(`🏃 ${w.name} уехал на другой объект. Вернётся... наверное.`);
      }
    }
  }

  private getForemenDrinkBonus(state: GameState): number {
    // Foreman reduces drink risk by 40%
    return state.hiredWorkers.some(w => w.isForeman) ? 0.6 : 1;
  }

  // ─────────────────────────────────────────────────────────
  hire(workerId: string, state: GameState, addLog: (msg: string) => void): void {
    if (state.hiredWorkers.some(w => w.workerId === workerId)) return;

    const def = this.getWorker(workerId);
    if (def === null) return;

    if (state.money < def.hireCost) {
      addLog(`❌ Не хватает денег на найм ${def.workerName}.`);
      return;
    }

    state.money -= def.hireCost;
    state.hiredWorkers.push({
      workerId: def.id,
      name: def.workerName,
      emoji: def.emoji,
      efficiency: def.efficiency,
      dailyCost: def.dailyCost,
      drinkRisk: def.drinkRisk,
      leaveRisk: def.leaveRisk,
      quality: def.quality,
      reliability: def.reliability,
      isForeman: def.isForeman,
      isOnBinge: false,
      bingeTicksLeft: 0,
      isOnAnotherSite: false,
      anotherSiteTicksLeft: 0,
      totalStolenAmount: 0,
    });

    addLog(`✅ ${def.workerName} (${def.role}) принят на работу. Дневная ставка: ${def.dailyCost.toLocaleString('ru')} ₽.`);
  }

  fire(workerId: string, state: GameState, addLog: (msg: string) => void): void {
    const w = state.hiredWorkers.find(x => x.workerId === workerId);
    if (!w) return;

    state.hiredWorkers = state.hiredWorkers.filter(x => x.workerId !== workerId);
    addLog(`👋 ${w.name} уволен. Смотрит с укором.`);
  }

  getWorker(id: string): WorkerDefinition | null {
    return this._allWorkers.find(w => w.id === id) ?? null;
  }

  getAllWorkers(): WorkerDefinition[] {
    return this._allWorkers;
  }

  getAvailableToHire(state: GameState): WorkerDefinition[] {
    const hiredIds = new Set(state.hiredWorkers.map(w => w.workerId));
    return this._allWorkers.filter(w =>
      !hiredIds.has(w.id) &&
      state.unlockedWorkerIds.has(w.id) &&
      w.requiredCompanyLevel <= state.companyLevel &&
      w.requiredReputation <= state.reputation,
    );
  }

  getTotalEfficiency(state: GameState): number {
    return state.hiredWorkers
      .filter(w => !w.isOnBinge && !w.isOnAnotherSite)
      .reduce((sum, w) => sum + w.efficiency, 0);
  }
}
