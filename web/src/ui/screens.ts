import type { GameState, HiredWorkerState, ActiveEventState } from '../systems/GameState';
import type { ContractDefinition } from '../systems/GameState';

export function fmt(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}М ₽`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}К ₽`;
  return `${Math.round(amount)} ₽`;
}

function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    Procurement:    '⚙️ Закупка',
    Construction:   '🏗️ Строительство',
    Finishing:      '🪟 Отделка',
    Documents:      '📋 Документы',
    SigningKS2:     '✍️ Подписание КС-2',
    WaitingPayment: '⏳ Ожидание оплаты',
    Completed:      '✅ Завершён',
  };
  return labels[phase] ?? phase;
}

// ─────────────────────────────────────────────────────────
export function renderHUD(state: GameState): string {
  const stressPct = Math.round(state.stress);
  const repPct    = Math.round(state.reputation);
  const stressColor = stressPct > 70 ? 'var(--red)' : stressPct > 40 ? 'var(--yellow)' : 'var(--dim)';
  return `
    <div id="hud-row1">
      <span id="company-name">🏗️ ${state.companyName}</span>
      <span id="day-counter">День ${state.day}</span>
    </div>
    <div id="money">${fmt(state.money)}</div>
    <div id="hud-meters">
      <div class="meter">
        <div class="meter-label" style="color:${stressColor}">😤 Стресс ${stressPct}%</div>
        <div class="meter-bar"><div class="meter-fill stress" style="width:${stressPct}%"></div></div>
      </div>
      <div class="meter">
        <div class="meter-label">⭐ Репутация ${repPct}%</div>
        <div class="meter-bar"><div class="meter-fill rep" style="width:${repPct}%"></div></div>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────
export function renderHome(state: GameState): string {
  const p = state.currentProject;

  const projectBlock = p && p.phase !== 'Completed'
    ? `<div class="card">
        <div class="card-title">${p.emoji} ${p.name}</div>
        <div class="phase-badge">${phaseLabel(p.phase)}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${Math.round(p.progress * 100)}%"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:0.78em;color:var(--dim);margin-top:2px">
          <span>Прогресс: ${Math.round(p.progress * 100)}%</span>
          <span>${p.client}</span>
        </div>
      </div>`
    : `<div class="card">
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-title">Нет активного проекта</div>
          <p>Перейдите во вкладку Контракты</p>
        </div>
      </div>`;

  const loans = state.activeLoans.length
    ? `<div class="card">
        <div class="card-title">💳 Активные кредиты</div>
        ${state.activeLoans.map(l => `
          <div class="stat-row">
            <span class="stat-label">${l.lenderName}</span>
            <span class="stat-value bad">${fmt(l.totalOwed)}</span>
          </div>`).join('')}
      </div>`
    : '';

  const logEntries = [...state.log].reverse().slice(0, 8);
  const logBlock = logEntries.length
    ? `<div class="card">
        <div class="card-title">📝 Журнал</div>
        ${logEntries.map(e => `<div class="log-entry">${e.message}</div>`).join('')}
      </div>`
    : '';

  return `
    <div class="card">
      <div class="stat-row">
        <span class="stat-label">Уровень компании</span>
        <span class="stat-value">Ур. ${state.companyLevel}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">🤝 Связи</span>
        <span class="stat-value">${state.connections}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Всего заработано</span>
        <span class="stat-value good">${fmt(state.totalEarned)}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Проектов завершено</span>
        <span class="stat-value">${state.completedProjects.length}</span>
      </div>
    </div>
    ${projectBlock}
    ${loans}
    ${logBlock}
  `;
}

// ─────────────────────────────────────────────────────────
export function renderBrigade(state: GameState): string {
  if (!state.hiredWorkers.length) {
    return `<div class="empty-state">
      <div class="empty-icon">👷</div>
      <div class="empty-title">Бригада пустая</div>
      <p>Рабочие появятся когда вы возьмёте первый контракт</p>
    </div>`;
  }

  const totalPayroll = state.hiredWorkers.reduce((s, w) => s + w.dailyCost, 0);

  const cards = state.hiredWorkers.map((w: HiredWorkerState) => {
    let badge = '';
    if (w.isOnBinge)       badge = '<span class="badge binge">🍺 Запой</span>';
    else if (w.isOnAnotherSite) badge = '<span class="badge away">🚧 Другой объект</span>';
    else if (w.isForeman)  badge = '<span class="badge">👔 Прораб</span>';

    return `<div class="worker-card">
      <div class="worker-emoji">${w.emoji}</div>
      <div class="worker-info">
        <div class="worker-name">${w.name} ${badge}</div>
        <div class="worker-stats">
          Эфф: ${Math.round(w.efficiency * 100)}% ·
          Кач: ${Math.round(w.quality * 100)}% ·
          ${fmt(w.dailyCost)}/д
        </div>
      </div>
    </div>`;
  }).join('');

  return `
    <div class="card">
      <div class="stat-row">
        <span class="stat-label">👷 Рабочих</span>
        <span class="stat-value">${state.hiredWorkers.length}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">💰 Зарплата/день</span>
        <span class="stat-value bad">-${fmt(totalPayroll)}</span>
      </div>
    </div>
    ${cards}
  `;
}

// ─────────────────────────────────────────────────────────
export function renderContracts(
  state: GameState,
  available: ContractDefinition[],
  onTake: (id: string) => void,
): string {
  const p = state.currentProject;
  void onTake; // handled via delegated click with data-contract-id

  // Active project view
  if (p && p.phase !== 'Completed') {
    const daysLeft = p.deadlineDay - state.day;
    const dlColor  = daysLeft <= 3 ? 'bad' : daysLeft <= 7 ? '' : 'good';
    const remaining = p.contractValue - p.advancePaid + p.extraRevenue - p.accruedPenalties;

    const actionButton = (() => {
      if (p.phase === 'Documents')
        return `<button class="btn btn-primary btn-full" id="btn-submit-docs" style="margin-top:12px">
                  📋 Подать документы
                </button>`;
      if (p.phase === 'SigningKS2')
        return `<button class="btn btn-primary btn-full" id="btn-sign-ks2" style="margin-top:12px">
                  ✍️ Подписать КС-2
                </button>`;
      return '';
    })();

    return `
      <div class="card">
        <div class="card-title">${p.emoji} ${p.name}</div>
        <div class="phase-badge">${phaseLabel(p.phase)}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${Math.round(p.progress * 100)}%"></div>
        </div>
        <div class="stat-row">
          <span class="stat-label">Клиент</span>
          <span class="stat-value">${p.client}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Настроение</span>
          <span class="stat-value">${Math.round(p.clientMood)}% 😊</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Дедлайн</span>
          <span class="stat-value ${dlColor}">
            ${daysLeft > 0 ? `через ${daysLeft} дн.` : `просрочено ${-daysLeft} дн.`}
          </span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Сумма</span>
          <span class="stat-value">${fmt(p.contractValue)}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Аванс</span>
          <span class="stat-value good">+${fmt(p.advancePaid)}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Ожидаем</span>
          <span class="stat-value">${fmt(remaining)}</span>
        </div>
        ${p.accruedPenalties > 0
          ? `<div class="stat-row">
               <span class="stat-label">Штрафы</span>
               <span class="stat-value bad">-${fmt(p.accruedPenalties)}</span>
             </div>` : ''}
        ${actionButton}
      </div>
      ${p.phase === 'Documents' ? `
        <div class="card">
          <div class="card-title">📋 Документы</div>
          <div class="stat-row">
            <span class="stat-label">Попыток</span>
            <span class="stat-value">${p.documentRejections} / ${p.documentMaxIterations}</span>
          </div>
          ${p.rejectionReasons.length
            ? `<div style="margin-top:8px;font-size:0.78em;color:var(--dim)">
                ${p.rejectionReasons.map(r => `<div>• ${r}</div>`).join('')}
               </div>`
            : ''}
        </div>` : ''}
    `;
  }

  // No active project — show contract market
  if (!available.length) {
    return `<div class="empty-state">
      <div class="empty-icon">📭</div>
      <div class="empty-title">Нет доступных контрактов</div>
      <p>Повысьте уровень компании или репутацию</p>
    </div>`;
  }

  function levelBadge(lvl: number): string {
    if (lvl <= 1) return '<span class="diff-badge diff-Easy">Легко</span>';
    if (lvl <= 2) return '<span class="diff-badge diff-Medium">Средне</span>';
    if (lvl <= 3) return '<span class="diff-badge diff-Hard">Сложно</span>';
    return '<span class="diff-badge diff-Expert">Эксперт</span>';
  }

  const cards = available.map(c => `
    <div class="contract-card" data-contract-id="${c.id}">
      <div class="contract-header">
        <span class="contract-name">${c.emoji} ${c.contractName}</span>
        <span class="contract-value">${fmt(c.contractValue)}</span>
      </div>
      <div class="contract-meta">
        ${c.client} · ${c.durationDays} дн.
        ${levelBadge(c.requiredCompanyLevel)}
      </div>
    </div>
  `).join('');

  return `
    <div class="card" style="margin-bottom:12px">
      <div class="card-title">📋 Доступные контракты</div>
      <div style="font-size:0.8em;color:var(--dim)">Нажмите на контракт чтобы взять его</div>
    </div>
    ${cards}
  `;
}

// ─────────────────────────────────────────────────────────
export function renderUpgrades(_state: GameState): string {
  return `<div class="empty-state">
    <div class="empty-icon">🔧</div>
    <div class="empty-title">Апгрейды</div>
    <p>Раздел в разработке 🚧</p>
  </div>`;
}

// ─────────────────────────────────────────────────────────
export function renderEventOverlay(event: ActiveEventState, _onOption: (i: number) => void): string {
  const options = event.options.map((opt, i) => {
    let costLine = '';
    if (opt.cost > 0)              costLine = `<div class="opt-cost">💸 -${fmt(opt.cost)}</div>`;
    else if (opt.connectionsCost > 0) costLine = `<div class="opt-cost">🤝 -${opt.connectionsCost} связей</div>`;
    else if (opt.requiresRewardedAd)  costLine = `<div class="opt-cost">📺 Реклама</div>`;
    return `<button class="event-option" data-opt="${i}">${opt.label}${costLine}</button>`;
  }).join('');

  return `
    <div id="event-overlay">
      <div id="event-popup">
        <div class="event-emoji">${event.emoji}</div>
        <div class="event-title">${event.title}</div>
        <div class="event-desc">${event.description}</div>
        ${options}
      </div>
    </div>
  `;
}
