import { GameState, ClientRelation, createGameState } from './GameState';

/**
 * LocalStorage-based save / load.
 * Mirrors Unity SaveSystem.cs (PlayerPrefs + Newtonsoft.Json) but uses
 * localStorage and JSON.stringify/parse instead.
 *
 * Serialization notes:
 * - Set<string|number> is stored as an array.
 * - Map<string, ClientRelation> is stored as a plain object { [key]: value }.
 * These are revived back to Set/Map on load.
 */

const SAVE_KEY = 'stroyka_save_v2';

export class SaveSystem {
  load(addLog?: (msg: string) => void): GameState {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        const fresh = createGameState();
        addLog?.(
          '🏗️ Добро пожаловать. ИП зарегистрировано. Вас ждёт великое будущее. Наверное.',
        );
        return fresh;
      }

      const parsed = JSON.parse(raw) as GameState;

      // Revive Set fields
      parsed.unlockedContractIds = new Set(parsed.unlockedContractIds as unknown as string[]);
      parsed.unlockedWorkerIds   = new Set(parsed.unlockedWorkerIds   as unknown as string[]);
      parsed.purchasedUpgrades   = new Set(parsed.purchasedUpgrades   as unknown as string[]);

      // Revive Map fields
      parsed.clientRelations = new Map<string, ClientRelation>(
        Object.entries((parsed.clientRelations as unknown as Record<string, ClientRelation>) ?? {}),
      );

      // Revive BattlePass Sets
      if (parsed.battlePass) {
        parsed.battlePass.claimedFreeRewards    = new Set(parsed.battlePass.claimedFreeRewards    as unknown as number[]);
        parsed.battlePass.claimedPremiumRewards = new Set(parsed.battlePass.claimedPremiumRewards as unknown as number[]);
      }

      return parsed;
    } catch (e) {
      console.error('[SaveSystem] Load failed, starting fresh:', e);
      return createGameState();
    }
  }

  save(state: GameState): void {
    try {
      const serialisable = {
        ...state,
        unlockedContractIds: [...state.unlockedContractIds],
        unlockedWorkerIds:   [...state.unlockedWorkerIds],
        purchasedUpgrades:   [...state.purchasedUpgrades],
        clientRelations:     Object.fromEntries(state.clientRelations),
        battlePass: {
          ...state.battlePass,
          claimedFreeRewards:    [...state.battlePass.claimedFreeRewards],
          claimedPremiumRewards: [...state.battlePass.claimedPremiumRewards],
        },
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(serialisable));
    } catch (e) {
      console.error('[SaveSystem] Save failed:', e);
    }
  }

  /** Wipes the save slot (mirrors SaveSystem.Delete() in C#). */
  delete(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
