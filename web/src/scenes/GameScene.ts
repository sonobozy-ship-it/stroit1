import Phaser from 'phaser';
import { GameManager } from '../systems/GameManager';
import { GameState, ActiveEventState } from '../systems/GameState';
import { CSS } from '../ui/styles';
import {
  renderHUD,
  renderHome,
  renderBrigade,
  renderContracts,
  renderUpgrades,
  renderEventOverlay,
} from '../ui/screens';

type TabId = 'home' | 'brigade' | 'contracts' | 'upgrades';

export class GameScene extends Phaser.Scene {
  private _gm!: GameManager;
  private _tab: TabId = 'home';
  private _ui!: HTMLElement;

  constructor() { super({ key: 'GameScene' }); }

  // ─────────────────────────────────────────────────────────
  create(): void {
    this._injectCSS();
    this._buildUI();

    this._gm = new GameManager();

    GameManager.onStateChanged.push((s) => this._refresh(s));
    GameManager.onGameOver.push(() => this._showGameOver());

    this._gm.start();
  }

  // ─────────────────────────────────────────────────────────
  // Build HTML UI directly in document.body

  private _buildUI(): void {
    const ui = document.createElement('div');
    ui.id = 'game-ui';
    ui.innerHTML = `
      <div id="hud"></div>
      <div id="screen-area"></div>
      <nav id="tab-bar">
        <button class="tab-btn active" data-tab="home">
          <span class="tab-icon">🏠</span>Главная
        </button>
        <button class="tab-btn" data-tab="brigade">
          <span class="tab-icon">👷</span>Бригада
        </button>
        <button class="tab-btn" data-tab="contracts">
          <span class="tab-icon">📋</span>Контракты
        </button>
        <button class="tab-btn" data-tab="upgrades">
          <span class="tab-icon">🔧</span>Апгрейды
        </button>
      </nav>
    `;
    document.body.appendChild(ui);
    this._ui = ui;

    // Tab clicks
    ui.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab as TabId));
    });

    // Delegated clicks in screen area
    ui.querySelector('#screen-area')!
      .addEventListener('click', (e) => this._onScreenClick(e));
  }

  // ─────────────────────────────────────────────────────────
  // Rendering

  private _refresh(state: GameState): void {
    this._ui.querySelector<HTMLElement>('#hud')!.innerHTML = renderHUD(state);
    this._renderScreen(state);
    this._renderEvent(state);
  }

  private _renderScreen(state: GameState): void {
    const area = this._ui.querySelector<HTMLElement>('#screen-area')!;
    switch (this._tab) {
      case 'home':      area.innerHTML = renderHome(state);      break;
      case 'brigade':   area.innerHTML = renderBrigade(state);   break;
      case 'contracts': {
        const avail = this._gm.projects.getAvailableContracts(this._gm.state);
        area.innerHTML = renderContracts(state, avail, (id) => this._gm.takeContract(id));
        break;
      }
      case 'upgrades':  area.innerHTML = renderUpgrades(state);  break;
    }
  }

  private _renderEvent(state: GameState): void {
    this._ui.querySelector('#event-overlay')?.remove();
    if (!state.activeEvents.length) return;

    const ev: ActiveEventState = state.activeEvents[0];
    const tmp = document.createElement('div');
    tmp.innerHTML = renderEventOverlay(ev, () => {});
    const overlay = tmp.firstElementChild as HTMLElement;

    overlay.querySelectorAll<HTMLButtonElement>('.event-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        this._gm.resolveEvent(ev.instanceId, parseInt(btn.dataset.opt ?? '0', 10));
      });
    });

    this._ui.appendChild(overlay);
  }

  // ─────────────────────────────────────────────────────────
  // Tab switching

  private _switchTab(tab: TabId): void {
    this._tab = tab;
    this._ui.querySelectorAll('.tab-btn').forEach((b) =>
      b.classList.toggle('active', (b as HTMLElement).dataset.tab === tab));
    this._renderScreen(this._gm.state);
    // Scroll to top on tab switch
    this._ui.querySelector<HTMLElement>('#screen-area')!.scrollTop = 0;
  }

  // ─────────────────────────────────────────────────────────
  // Delegated clicks

  private _onScreenClick(e: Event): void {
    const t = e.target as HTMLElement;
    const btn = t.closest('[id]') as HTMLElement | null;
    if (!btn) return;

    switch (btn.id) {
      case 'btn-take-contract': {
        const available = this._gm.projects.getAvailableContracts(this._gm.state);
        if (available.length > 0) this._gm.takeContract(available[0].id);
        else this._gm.addLog('📋 Нет доступных контрактов.');
        this._refresh(this._gm.state);
        break;
      }
      case 'btn-submit-docs':
        this._gm.submitDocuments();
        break;
      case 'btn-sign-ks2':
        this._gm.signKS2();
        break;
    }

    // Contract card tap
    const contractCard = t.closest<HTMLElement>('.contract-card');
    if (contractCard?.dataset.contractId) {
      this._gm.takeContract(contractCard.dataset.contractId);
      this._switchTab('contracts');
    }
  }

  // ─────────────────────────────────────────────────────────
  // Game over

  private _showGameOver(): void {
    const s = this._gm.state;
    const overlay = document.createElement('div');
    overlay.id = 'gameover-overlay';
    overlay.innerHTML = `
      <div id="gameover-popup">
        <div style="font-size:3em;text-align:center">💀</div>
        <h2>Нервный срыв</h2>
        <p>Вы бросили стройку и открыли шаурмячную.<br>Говорят, там лучше.</p>
        <div class="stat-row">
          <span class="stat-label">Дней прожито</span>
          <span class="stat-value">${s.day}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Проектов сдано</span>
          <span class="stat-value">${s.completedProjects.length}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Заработано</span>
          <span class="stat-value good">${s.totalEarned.toLocaleString('ru')} ₽</span>
        </div>
        <button class="btn btn-primary btn-full" id="btn-restart" style="margin-top:20px">
          🔄 Начать заново
        </button>
      </div>
    `;
    overlay.querySelector('#btn-restart')!.addEventListener('click', () => {
      localStorage.removeItem('stroyka_save_v2');
      window.location.reload();
    });
    this._ui.appendChild(overlay);
  }

  // ─────────────────────────────────────────────────────────
  // CSS injection

  private _injectCSS(): void {
    if (document.getElementById('stroyka-css')) return;
    const style = document.createElement('style');
    style.id = 'stroyka-css';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  shutdown(): void {
    this._gm?.stop();
    document.getElementById('game-ui')?.remove();
    document.getElementById('stroyka-css')?.remove();
  }
}
