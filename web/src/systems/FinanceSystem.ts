import {
  GameState,
  ActiveLoan,
  LoanType,
  PaymentOutcome,
  PendingPayment,
  ProjectPhase,
  ProjectState,
} from './GameState';

export class FinanceSystem {
  // ─────────────────────────────────────────────────────────
  // Tick processing

  processDailyCosts(state: GameState, addLog: (msg: string) => void): void {
    // Worker salaries
    if (state.hiredWorkers.length > 0) {
      const dailyCost = state.hiredWorkers.reduce((sum, w) => sum + w.dailyCost, 0);
      state.money -= dailyCost;
    }

    // Loan daily interest
    for (const loan of state.activeLoans) {
      state.money -= loan.dailyInterest;
      loan.totalOwed += loan.dailyInterest;

      if (state.tick >= loan.dueTick && !loan.isOverdue) {
        loan.isOverdue = true;
        this.onLoanOverdue(loan, state, addLog);
      }
    }

    // Cash flow warnings
    const runway = this.getDaysOfRunway(state);
    if (state.money < 0) {
      state.stress = Math.min(100, state.stress + 8);
      if (state.day % 2 === 0)
        addLog(`🔴 Касса в минусе: ${state.money.toLocaleString('ru')} ₽. Бригада ждёт денег.`);
    } else if (runway <= 2) {
      state.stress = Math.min(100, state.stress + 3);
      addLog(`⚠️ Осталось на ${runway} дн. работы бригады. Кассовый разрыв близко.`);
    }

    if (state.money < -500_000) {
      state.stress = Math.min(100, state.stress + 15);
      addLog('💀 Долг критический. Поставщики угрожают. Рабочие бунтуют.');
    }
  }

  processPendingPayments(
    state: GameState,
    addLog: (msg: string) => void,
    onFinalizeProject?: (state: GameState) => void,
  ): void {
    const arrived = state.pendingPayments.filter(p => state.tick >= p.arrivalTick);
    for (const payment of arrived) {
      state.pendingPayments = state.pendingPayments.filter(p => p !== payment);
      this.applyPaymentArrival(payment, state, addLog, onFinalizeProject);
    }
  }

  private applyPaymentArrival(
    payment: PendingPayment,
    state: GameState,
    addLog: (msg: string) => void,
    onFinalizeProject?: (state: GameState) => void,
  ): void {
    switch (payment.outcome) {
      case PaymentOutcome.Full:
        state.money += payment.amount;
        state.totalEarned += payment.amount;
        state.stress = Math.max(0, state.stress - 15);
        addLog(`💰 Оплата пришла! +${payment.amount.toLocaleString('ru')} ₽ от ${payment.client}. Касса дышит.`);
        break;

      case PaymentOutcome.Partial: {
        const partial = Math.floor(payment.amount * (Math.random() * (0.85 - 0.5) + 0.5));
        state.money += partial;
        state.totalEarned += partial;
        state.stress = Math.min(100, state.stress + 5);
        state.reputation = Math.max(0, state.reputation - 3);
        addLog(
          `😤 ${payment.client} заплатил только ${partial.toLocaleString('ru')} ₽ из ${payment.amount.toLocaleString('ru')} ₽. «Нашли нарушения в смете».`,
        );
        break;
      }

      case PaymentOutcome.Delayed: {
        // Reschedule — add more wait
        const extraWait = Math.floor(Math.random() * (1800 - 600) + 600);
        const requeue: PendingPayment = {
          projectName: payment.projectName,
          client: payment.client,
          amount: payment.amount,
          outcome: PaymentOutcome.Full, // delayed once → pays next time
          arrivalTick: state.tick + extraWait,
          arrivalTickOriginal: state.tick + extraWait,
          outcomeRevealed: false,
        };
        state.pendingPayments.push(requeue);
        state.stress = Math.min(100, state.stress + 12);
        addLog(
          `🏛️ КАЗНАЧЕЙСТВО: платёж ${payment.amount.toLocaleString('ru')} ₽ перенесён. «Технические причины». Ждите ещё ${Math.floor(extraWait / 60)} мин.`,
        );
        break;
      }

      case PaymentOutcome.Disappeared:
        state.stress = Math.min(100, state.stress + 25);
        state.reputation = Math.max(0, state.reputation - 10);
        addLog(
          `🏃 ${payment.client} исчез. ${payment.amount.toLocaleString('ru')} ₽ потеряны. Телефон недоступен. Говорят, уехал в Дубай.`,
        );
        break;
    }

    // Finalize project if it was waiting
    if (state.currentProject?.phase === ProjectPhase.WaitingPayment) {
      onFinalizeProject?.(state);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Payment outcome roll

  /**
   * Called when КС-2 is signed. Rolls the outcome secretly;
   * revealed when the payment actually arrives.
   */
  rollPaymentOutcome(project: ProjectState, state: GameState): PaymentOutcome {
    const relation = state.clientRelations.get(project.clientId);
    const isRegular = relation?.isRegular ?? false;

    // Regular clients are more reliable
    let roll = Math.random();
    if (isRegular) roll = Math.max(roll, Math.random()); // advantage roll

    switch (project.clientType) {
      case 'goszakaz':
        if (roll < 0.45) return PaymentOutcome.Full;
        if (roll < 0.80) return PaymentOutcome.Delayed; // казначейство delays again
        return PaymentOutcome.Partial;                   // госка never fully disappears

      case 'toxic':
        if (roll < 0.35) return PaymentOutcome.Full;
        if (roll < 0.65) return PaymentOutcome.Partial;
        if (roll < 0.85) return PaymentOutcome.Delayed;
        return PaymentOutcome.Disappeared;

      case 'genpodryad':
        if (roll < 0.40) return PaymentOutcome.Full;
        if (roll < 0.70) return PaymentOutcome.Partial;  // удержания
        if (roll < 0.88) return PaymentOutcome.Delayed;
        return PaymentOutcome.Disappeared;

      default: // "normal"
        if (roll < 0.65) return PaymentOutcome.Full;
        if (roll < 0.85) return PaymentOutcome.Partial;
        if (roll < 0.95) return PaymentOutcome.Delayed;
        return PaymentOutcome.Disappeared;
    }
  }

  // ─────────────────────────────────────────────────────────
  // Loans

  takeLoan(type: LoanType, amount: number, state: GameState, addLog: (msg: string) => void): void {
    let feePercent: number;
    let daysToRepay: number;
    let lenderName: string;

    switch (type) {
      case LoanType.Bank:
        feePercent = 0.15; daysToRepay = 7;  lenderName = 'Сбербизнес'; break;
      case LoanType.QuickMoney:
        feePercent = 0.40; daysToRepay = 3;  lenderName = 'МикроФинанс'; break;
      case LoanType.LoanShark:
        feePercent = 0.80; daysToRepay = 2;  lenderName = 'Дядя Толя'; break;
      case LoanType.FriendLoan:
        feePercent = 0.00; daysToRepay = 14; lenderName = 'Коллега Серёга'; break;
      default:
        feePercent = 0.30; daysToRepay = 5;  lenderName = 'Неизвестный источник'; break;
    }

    if (type === LoanType.FriendLoan && state.connections < 30) {
      addLog('❌ Нужно 30 Связей, чтобы занять у знакомых.');
      return;
    }

    const totalOwed = Math.floor(amount * (1 + feePercent));
    const dailyInterest = type === LoanType.LoanShark ? Math.floor(amount * 0.1) : 0;
    const dueTick = state.tick + daysToRepay * 30;

    state.money += amount;
    state.activeLoans.push({
      id: crypto.randomUUID().replace(/-/g, '').slice(0, 8),
      lenderName,
      type,
      principalAmount: amount,
      totalOwed,
      dailyInterest,
      dueTick,
      isOverdue: false,
    });

    state.stress = Math.min(100, state.stress + (type === LoanType.LoanShark ? 20 : 5));

    let warning: string;
    switch (type) {
      case LoanType.LoanShark:  warning = '⚠️ Дядя Толя не шутит. Отдашь вовремя.'; break;
      case LoanType.QuickMoney: warning = '💸 МикроФинанс взял подпись. Верни через 3 дня.'; break;
      case LoanType.FriendLoan: warning = '🤝 Серёга дал. Не подведи.'; break;
      default:                  warning = '🏦 Кредит одобрен.'; break;
    }
    addLog(`${warning} Займ: ${amount.toLocaleString('ru')} ₽. Отдать: ${totalOwed.toLocaleString('ru')} ₽ (${daysToRepay} дн.).`);
  }

  repayLoan(loanId: string, state: GameState, addLog: (msg: string) => void): void {
    const loan = state.activeLoans.find(l => l.id === loanId);
    if (!loan) return;

    if (state.money < loan.totalOwed) {
      addLog(`❌ Не хватает ${(loan.totalOwed - state.money).toLocaleString('ru')} ₽ для погашения займа у ${loan.lenderName}.`);
      return;
    }

    state.money -= loan.totalOwed;
    state.activeLoans = state.activeLoans.filter(l => l.id !== loanId);
    state.stress = Math.max(0, state.stress - 10);
    addLog(`✅ Займ у ${loan.lenderName} погашен. Спим спокойно.`);
  }

  private onLoanOverdue(loan: ActiveLoan, state: GameState, addLog: (msg: string) => void): void {
    switch (loan.type) {
      case LoanType.LoanShark:
        state.stress = Math.min(100, state.stress + 30);
        if (state.hiredWorkers.length > 0) {
          const taken = state.hiredWorkers[0];
          state.hiredWorkers = state.hiredWorkers.slice(1);
          addLog(`💀 Дядя Толя забрал ${taken.name} в счёт долга. Это было неприятно.`);
        } else {
          addLog('💀 Дядя Толя очень недоволен. Ждите последствий.');
        }
        break;
      case LoanType.QuickMoney:
        state.stress = Math.min(100, state.stress + 15);
        state.reputation = Math.max(0, state.reputation - 10);
        addLog('⚠️ МикроФинанс передал долг коллекторам. Репутация упала.');
        break;
      default:
        state.stress = Math.min(100, state.stress + 8);
        addLog(`⏰ Просрочка у ${loan.lenderName}. Проценты капают.`);
        break;
    }
  }

  // ─────────────────────────────────────────────────────────
  // Helpers

  speedUpPendingPayment(usedRewardedAd: boolean, state: GameState, addLog: (msg: string) => void): void {
    if (state.pendingPayments.length === 0) return;
    const next = state.pendingPayments.slice().sort((a, b) => a.arrivalTick - b.arrivalTick)[0];

    const reduction = usedRewardedAd ? 1800 : 600;
    next.arrivalTick = Math.max(state.tick + 5, next.arrivalTick - reduction);
    addLog(`📞 ${usedRewardedAd ? 'Позвонили в бухгалтерию' : 'Связи задействованы'}. Оплата ускорена.`);
  }

  getDailyBurn(state: GameState): number {
    return (
      state.hiredWorkers.reduce((sum, w) => sum + w.dailyCost, 0) +
      state.activeLoans.reduce((sum, l) => sum + l.dailyInterest, 0)
    );
  }

  getDaysOfRunway(state: GameState): number {
    const burn = this.getDailyBurn(state);
    if (burn === 0) return 999;
    return Math.max(0, Math.floor(state.money / burn));
  }
}
