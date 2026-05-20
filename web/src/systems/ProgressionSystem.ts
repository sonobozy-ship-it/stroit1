import { GameState, UpgradeDefinition } from './GameState';

export class ProgressionSystem {
  private readonly _allUpgrades: UpgradeDefinition[];

  constructor(allUpgrades: UpgradeDefinition[] = []) {
    this._allUpgrades = allUpgrades;
  }

  // ─────────────────────────────────────────────────────────
  checkUnlocks(state: GameState, addLog: (msg: string) => void): void {
    const count = state.completedProjects.length;

    // Level up company
    let newLevel: number;
    if (count >= 20) newLevel = 5;
    else if (count >= 10) newLevel = 4;
    else if (count >= 5) newLevel = 3;
    else if (count >= 2) newLevel = 2;
    else newLevel = 1;

    if (newLevel > state.companyLevel) {
      state.companyLevel = newLevel;
      const levelNames = ['', 'ИП', 'Бригада', 'Компания', 'Генподряд', 'Империя'];
      addLog(`🏆 Уровень компании: ${levelNames[newLevel]}! Открыты новые контракты.`);
    }

    // Unlock content based on completed projects
    this.unlockByProjectCount(state, count);
  }

  private unlockByProjectCount(state: GameState, count: number): void {
    if (count >= 1)  state.unlockedWorkerIds.add('sanya');
    if (count >= 1)  state.unlockedContractIds.add('kvartira_premium');
    if (count >= 2)  state.unlockedContractIds.add('ofis_small');
    if (count >= 2)  state.unlockedWorkerIds.add('misha');
    if (count >= 3)  state.unlockedWorkerIds.add('petya');
    if (count >= 4)  state.unlockedContractIds.add('magazin_remont');
    if (count >= 5)  state.unlockedWorkerIds.add('arkadiy');
    if (count >= 5)  state.unlockedContractIds.add('kottedzh');
    if (count >= 7)  state.unlockedWorkerIds.add('igor');
    if (count >= 10) state.unlockedContractIds.add('biznes_tsentr');
    if (count >= 10) state.unlockedContractIds.add('detskiy_sad');
    if (count >= 15) state.unlockedWorkerIds.add('dima');
    if (count >= 20) state.unlockedContractIds.add('goskontrakt');
  }

  // ─────────────────────────────────────────────────────────
  purchaseUpgrade(upgradeId: string, state: GameState, addLog: (msg: string) => void): void {
    const def = this.getUpgrade(upgradeId);
    if (def === null) return;

    if (state.purchasedUpgrades.has(upgradeId)) {
      addLog('❌ Апгрейд уже куплен.');
      return;
    }

    if (state.money < def.moneyCost || state.connections < def.connectionsCost) {
      addLog('❌ Недостаточно ресурсов для апгрейда.');
      return;
    }

    state.money -= def.moneyCost;
    state.connections -= def.connectionsCost;
    state.purchasedUpgrades.add(upgradeId);

    // Apply unlock effects
    for (const c of def.unlocksContracts) state.unlockedContractIds.add(c);
    for (const w of def.unlocksWorkers) state.unlockedWorkerIds.add(w);

    addLog(`✅ Апгрейд: ${def.upgradeName}. ${def.description}`);
  }

  spendConnections(purpose: string, state: GameState, addLog: (msg: string) => void): void {
    const cost = 10;
    if (state.connections < cost) {
      addLog('❌ Недостаточно Связей.');
      return;
    }
    state.connections -= cost;
    addLog(`🤝 Связи задействованы: ${purpose}.`);
  }

  addConnections(amount: number, state: GameState, addLog: (msg: string) => void): void {
    state.connections += amount;
    addLog(`🤝 +${amount} Связей.`);
  }

  getUpgrade(id: string): UpgradeDefinition | null {
    return this._allUpgrades.find(u => u.id === id) ?? null;
  }

  getAvailable(state: GameState): UpgradeDefinition[] {
    return this._allUpgrades.filter(u =>
      !state.purchasedUpgrades.has(u.id) &&
      u.requiredCompanyLevel <= state.companyLevel &&
      u.requiredReputation <= state.reputation &&
      (u.requiredUpgrades ?? []).every(r => state.purchasedUpgrades.has(r)),
    );
  }
}
