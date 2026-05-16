import { GameState, ClientRelation, ProjectState } from './GameState';

/**
 * Tracks per-client history. After 2+ successful projects:
 * client becomes "regular" → better advance, faster payment, higher starting mood.
 */
export class ClientRelationsSystem {
  // ─────────────────────────────────────────────────────────
  // Called after a project is finalized

  recordCompletion(
    project: ProjectState,
    state: GameState,
    addLog: (msg: string) => void,
  ): void {
    if (!project.clientId) return;

    let relation = state.clientRelations.get(project.clientId);
    if (!relation) {
      relation = this.createRelation(project);
      state.clientRelations.set(project.clientId, relation);
    }

    relation.projectsCompleted++;

    // Rolling average of mood
    relation.averageMoodAtClose =
      (relation.averageMoodAtClose * (relation.projectsCompleted - 1) + project.clientMood) /
      relation.projectsCompleted;

    // Payment speed bonus stacks per successful project (capped at 300 ticks = 5 min)
    if (project.clientMood >= 60)
      relation.paymentSpeedBonus = Math.min(300, relation.paymentSpeedBonus + 60);

    // Advance percent bonus (up to +10%)
    if (project.clientMood >= 70)
      relation.advancePercentBonus = Math.min(0.1, relation.advancePercentBonus + 0.02);

    // Become a regular client
    const wasRegular = relation.isRegular;
    relation.isRegular =
      relation.projectsCompleted >= 2 && relation.averageMoodAtClose >= 60;

    if (relation.isRegular && !wasRegular) {
      addLog(
        `🤝 ${relation.clientName} стал постоянным заказчиком. Аванс больше, оплата быстрее.`,
      );
    }
  }

  recordAbandonment(
    project: ProjectState,
    state: GameState,
    addLog: (msg: string) => void,
  ): void {
    if (!project.clientId) return;

    let relation = state.clientRelations.get(project.clientId);
    if (!relation) {
      relation = this.createRelation(project);
      state.clientRelations.set(project.clientId, relation);
    }

    relation.isBlacklisted = true;
    relation.isRegular = false;
    addLog(`⛔ ${project.client} занесён в чёрный список. Работать с ним больше не стоит.`);
  }

  // ─────────────────────────────────────────────────────────
  // Query helpers

  /** Returns advance % modifier for a known client (0 = no bonus). */
  getAdvanceBonus(clientId: string, state: GameState): number {
    const rel = state.clientRelations.get(clientId);
    if (rel?.isRegular) return rel.advancePercentBonus;
    return 0;
  }

  /** Returns tick reduction on payment wait for a known client. */
  getPaymentSpeedBonus(clientId: string, state: GameState): number {
    const rel = state.clientRelations.get(clientId);
    if (rel?.isRegular) return Math.floor(rel.paymentSpeedBonus);
    return 0;
  }

  /** Mood boost at project start for regular clients. */
  getStartingMoodBonus(clientId: string, state: GameState): number {
    const rel = state.clientRelations.get(clientId);
    if (rel?.isRegular) return Math.min(15, rel.projectsCompleted * 3);
    return 0;
  }

  getRelation(clientId: string, state: GameState): ClientRelation | undefined {
    return state.clientRelations.get(clientId);
  }

  // ─────────────────────────────────────────────────────────
  private createRelation(project: ProjectState): ClientRelation {
    return {
      clientId: project.clientId,
      clientName: project.client,
      clientType: project.clientType,
      projectsCompleted: 0,
      averageMoodAtClose: 50,
      isRegular: false,
      isBlacklisted: false,
      paymentSpeedBonus: 0,
      advancePercentBonus: 0,
    };
  }
}
