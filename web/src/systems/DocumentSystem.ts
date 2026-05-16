import { GameState, ProjectPhase } from './GameState';

/**
 * Handles ИД (executive documentation) submission mini-game.
 * The player submits documents → ПТО reviews → finds a "problem" → returns for revision.
 * After enough successful submissions (or using Connections), КС-2 becomes signable.
 */
export class DocumentSystem {
  private static readonly REJECTION_REASONS: string[] = [
    'Нет подписи на листе 48',
    'Не совпадает дата в журнале работ',
    'Отсутствует печать на акте скрытых работ №3',
    'Неправильный шрифт в исполнительной схеме',
    'Не хватает фотофиксации узла Б-4',
    'ПТО требует повторного освидетельствования сварных швов',
    'Сертификат на кабель устарел',
    'Схема не соответствует проектной документации',
    'Подпись не соответствует образцу в карточке',
    'Документы переданы не в той папке (нужна папка-скоросшиватель)',
    'ПТО потеряло папку. Просим подать заново.',
    'Формат файла не принимается. Нужен Word, не PDF.',
    'Акт подписан не тем цветом ручки',
    'Отсутствует протокол испытания системы вентиляции',
    'Исполнительная схема не откалибрована по ГГС',
  ];

  // ─────────────────────────────────────────────────────────

  submit(
    state: GameState,
    addLog: (msg: string) => void,
    onDocumentAccepted?: (state: GameState, rejections: number) => void,
  ): void {
    const p = state.currentProject;
    if (p === null || p.phase !== ProjectPhase.Documents) return;

    p.documentRejections++;
    state.stress = Math.min(100, state.stress + 5);

    if (p.documentRejections >= p.documentMaxIterations) {
      // Documents finally accepted
      this.acceptDocuments(state, addLog, onDocumentAccepted);
    } else {
      // ПТО found a problem
      const reasons = DocumentSystem.REJECTION_REASONS;
      const reason = reasons[Math.floor(Math.random() * reasons.length)];
      p.rejectionReasons.push(reason);

      const iteration = p.documentRejections;
      const remaining = p.documentMaxIterations - iteration;

      addLog(
        `📋 ПТО вернуло ИД (раз ${iteration}/${p.documentMaxIterations}): «${reason}»`,
      );

      if (remaining === 1)
        addLog('💡 Ещё одна сдача — и примут. Наверное.');
    }
  }

  submitWithConnections(
    state: GameState,
    addLog: (msg: string) => void,
    onDocumentAccepted?: (state: GameState, rejections: number) => void,
  ): void {
    const p = state.currentProject;
    if (p === null || p.phase !== ProjectPhase.Documents) return;

    const connectionsCost = 20;
    if (state.connections < connectionsCost) {
      addLog('❌ Недостаточно Связей (нужно 20).');
      return;
    }

    state.connections -= connectionsCost;
    this.acceptDocuments(state, addLog, onDocumentAccepted);
    addLog('🤝 Позвонили знакомому в ПТО. ИД приняли с первого раза.');
  }

  private acceptDocuments(
    state: GameState,
    addLog: (msg: string) => void,
    onDocumentAccepted?: (state: GameState, rejections: number) => void,
  ): void {
    const p = state.currentProject!;
    p.documentsReady = true;
    p.phase = ProjectPhase.SigningKS2;
    state.stress = Math.max(0, state.stress - 5);
    state.reputation = Math.min(100, state.reputation + 2);

    addLog(
      p.documentRejections <= 1
        ? '✅ ИД принято с первого раза. Вы легенда.'
        : `✅ ИД наконец принято (после ${p.documentRejections} итераций). Можно подписывать КС-2.`,
    );

    onDocumentAccepted?.(state, p.documentRejections);
  }
}
