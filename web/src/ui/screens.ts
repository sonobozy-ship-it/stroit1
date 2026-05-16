import type { GameState, HiredWorkerState, ActiveEventState } from '../systems/GameState';

export function fmt(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}М ₽`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}К ₽`;
  return `${Math.round(amount)} ₽`;
}

function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    Procurement: '⚙️ Закупка',
    Construction: '🏗️ Строительство',
    Finishing: '🪟 Отделка',
    Documents: '📋 Документы',
    SigningKS2: '✍️ Подписание КС-2',
    WaitingPayment: '⏳ Ожидание оплаты',
    Completed: '✅ Завершён',
  };
  return labels[phase] ?? phase;
}

export function renderHUD(state: GameState): string {
  const stressPct = Math.round(state.stress);
  const repPct = Math.round(state.reputation);
  return `
    <div id="hud-row1">
      <span id="company-name">🏗️ ${state.companyName}</span>
      <span id="day-counter">День ${state.day}</span>
    </div>
    <div id="money">${fmt(state.money)}</div>
    <div id="hud-meters">
      <div class="meter">
        <div class="meter-label">😤 Стресс ${stressPct}%</div>
        <div class="meter-bar"><div class="meter-fill stress" style="width:${stressPct}%"></div></div>
      </div>
      <div class="meter">
        <div class="meter-label">⭐ Репутация ${repPct}%</div>
        <div class="meter-bar"><div class="meter-fill rep" style="width:${repPct}%"></div></div>
      </div>
    </div>
  `;
}

export function renderHome(state: GameState): string {
  const project = state.currentProject;
  const projectBlock = project && project.phase !== 'Completed'
    ? `<div class="card">
        <div class="card-title">${project.emoji} ${project.name}</div>
        <div class="phase-badge">${phaseLabel(project.phase)}</div>
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(project.progress * 100)}%"></div></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-dim)">
          <span>Прогресс: ${Math.round(project.progress * 100)}%</span>
          <span>Клиент: ${project.client}</span>
        </div>
      </div>`
    : `<div class="card">
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-title">Нет активного проекта</div>
          <p>Перейдите во вкладку Контракты</p>
        </div>
      </div>`;

  const loans = state.activeLoans.length > 0
    ? `<div class="card">
        <div class="card-title">💳 Кредиты</div>
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
      <div class="stat-row"><span class="stat-label">Уровень компании</span><span class="stat-value">${state.companyLevel}</span></div>
      <div class="stat-row"><span class="stat-label">Связи</span><span class="stat-value">${state.connections}</span></div>
      <div class="stat-row"><span class="stat-label">Всего заработано</span><span class="stat-value good">${fmt(state.totalEarned)}</span></div>
      <div class="stat-row"><span class="stat-label">Проектов завершено</span><span class="stat-value">${state.completedProjects.length}</span></div>
    </div>
    ${projectBlock}
    ${loans}
    ${logBlock}
  `;
}

export function renderBrigade(state: GameState): string {
  if (state.hiredWorkers.length === 0) {
    return `<div class="empty-state">
      <div class="empty-icon">👷</div>
      <div class="empty-title">Бригада пустая</div>
      <p>Наймите рабочих через рынок</p>
    </div>`;
  }

  const totalPayroll = state.hiredWorkers.reduce((s, w) => s + w.dailyCost, 0);

  const cards = state.hiredWorkers.map((w: HiredWorkerState) => {
    let badge = '';
    if (w.isOnBinge) badge = '<span class="badge binge">🍺 Запой</span>';
    else if (w.isOnAnotherSite) badge = '<span class="badge away">🚧 На другом объекте</span>';
    else if (w.isForeman) badge = '<span class="badge">👔 Прораб</span>';

    return `<div class="worker-card">
      <div class="worker-emoji">${w.emoji}</div>
      <div class="worker-info">
        <div class="worker-name">${w.name} ${badge}</div>
        <div class="worker-stats">Эфф: ${Math.round(w.efficiency * 100)}% · Качество: ${Math.round(w.quality * 100)}% · ${fmt(w.dailyCost)}/день</div>
      </div>
    </div>`;
  }).join('');

  return `
    <div class="card">
      <div class="stat-row"><span class="stat-label">👷 Рабочих</span><span class="stat-value">${state.hiredWorkers.length}</span></div>
      <div class="stat-row"><span class="stat-label">💰 Зарплата/день</span><span class="stat-value bad">${fmt(totalPayroll)}</span></div>
    </div>
    ${cards}
  `;
}

export function renderContracts(state: GameState): string {
  const project = state.currentProject;
  if (!project || project.phase === 'Completed') {
    return `<div class="empty-state">
      <div class="empty-icon">📄</div>
      <div class="empty-title">Нет активного контракта</div>
      <p style="margin-bottom:20px">Возьмите новый проект чтобы начать зарабатывать</p>
      <button class="btn btn-primary btn-full" id="btn-take-contract">📋 Взять контракт</button>
    </div>`;
  }

  const daysLeft = project.deadlineDay - state.day;
  const deadlineColor = daysLeft <= 3 ? 'bad' : 'good';
  const remaining = project.contractValue - project.advancePaid + project.extraRevenue - project.accruedPenalties;

  return `
    <div class="card">
      <div class="card-title">${project.emoji} ${project.name}</div>
      <div class="phase-badge">${phaseLabel(project.phase)}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${Math.round(project.progress * 100)}%"></div></div>
      <div class="stat-row"><span class="stat-label">Клиент</span><span class="stat-value">${project.client}</span></div>
      <div class="stat-row"><span class="stat-label">Настроение клиента</span><span class="stat-value">${Math.round(project.clientMood)}%</span></div>
      <div class="stat-row"><span class="stat-label">Дедлайн</span><span class="stat-value ${deadlineColor}">${daysLeft > 0 ? `через ${daysLeft} дн.` : `просрочено ${-daysLeft} дн.`}</span></div>
      <div class="stat-row"><span class="stat-label">Сумма контракта</span><span class="stat-value">${fmt(project.contractValue)}</span></div>
      <div class="stat-row"><span class="stat-label">Аванс получен</span><span class="stat-value good">${fmt(project.advancePaid)}</span></div>
      <div class="stat-row"><span class="stat-label">Ожидаем</span><span class="stat-value">${fmt(remaining)}</span></div>
      ${project.accruedPenalties > 0 ? `<div class="stat-row"><span class="stat-label">Штрафы</span><span class="stat-value bad">-${fmt(project.accruedPenalties)}</span></div>` : ''}
    </div>
    ${project.phase === 'Documents' ? `
    <div class="card">
      <div class="card-title">📋 Документы</div>
      <div class="stat-row"><span class="stat-label">Попыток</span><span class="stat-value">${project.documentRejections} / ${project.documentMaxIterations}</span></div>
      ${project.rejectionReasons.length ? `<div style="margin-top:8px;font-size:12px;color:var(--text-dim)">${project.rejectionReasons.map(r => `<div>• ${r}</div>`).join('')}</div>` : ''}
    </div>` : ''}
  `;
}

export function renderUpgrades(_state: GameState): string {
  return `<div class="empty-state">
    <div class="empty-icon">🔧</div>
    <div class="empty-title">Апгрейды</div>
    <p>Раздел в разработке 🚧</p>
  </div>`;
}

export function renderEventOverlay(event: ActiveEventState, onOption: (i: number) => void): string {
  const options = event.options.map((opt, i) => {
    let costLine = '';
    if (opt.cost > 0) costLine = `<div class="opt-cost">💸 -${fmt(opt.cost)}</div>`;
    else if (opt.connectionsCost > 0) costLine = `<div class="opt-cost">🤝 -${opt.connectionsCost} связей</div>`;
    else if (opt.requiresRewardedAd) costLine = `<div class="opt-cost">📺 Реклама</div>`;
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
