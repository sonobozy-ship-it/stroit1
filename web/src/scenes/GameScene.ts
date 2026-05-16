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

/**
 * GameScene — main game scene.
 * Injects a full-screen HTML div via Phaser's DOM element system,
 * then keeps it in sync with GameState via the onStateChanged callback.
 */
export class GameScene extends Phaser.Scene {
  private _gm!: GameManager;
  private _activeTab: TabId = 'home';
  private _uiEl: HTMLElement | null = null;
  private _styleEl: HTMLStyleElement | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  // ─────────────────────────────────────────────────────────
  create(): void {
    // Inject global CSS once
    this._injectCSS();

    // Boot the game manager
    this._gm = new GameManager();

    // Build DOM UI
    this._buildUI();

    // Subscribe to state changes
    GameManager.onStateChanged.push((state) => this._refreshUI(state));

    // Subscribe to game over
    GameManager.onGameOver.push(() => this._showGameOver());

    // Start the tick loop — also fires initial notify
    this._gm.start();

    // Initial render with current state
    this._refreshUI(this._gm.state);
  }

  // ─────────────────────────────────────────────────────────
  // DOM construction

  private _buildUI(): void {
    const { width, height } = this.scale;

    // Root wrapper injected via Phaser DOM
    const domEl = this.add.dom(width / 2, height / 2).createFromHTML(`
      <div id="game-ui">
        <div id="hud"></div>
        <div id="screen-area"></div>
        <div id="tab-bar">
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
            <span class="tab-icon">⬆️</span>Апгрейды
          </button>
        </div>
      </div>
    `);

    // Size the DOM element to fill the viewport
    domEl.setOrigin(0.5);

    this._uiEl = document.getElementById('game-ui');
    if (!this._uiEl) return;

    // Wire tab buttons
    this._uiEl.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab as TabId;
        this._switchTab(tab);
      });
    });

    // Listen for delegated button clicks in screen area
    const screenArea = this._uiEl.querySelector<HTMLElement>('#screen-area');
    if (screenArea) {
      screenArea.addEventListener('click', (e) => this._handleScreenClick(e));
    }
  }

  // ─────────────────────────────────────────────────────────
  // Rendering

  private _refreshUI(state: GameState): void {
    const ui = this._uiEl;
    if (!ui) return;

    // HUD
    const hud = ui.querySelector<HTMLElement>('#hud');
    if (hud) hud.innerHTML = renderHUD(state);

    // Current screen content
    this._renderScreen(state);

    // Event overlay — shown on top when there are active events
    this._renderEventOverlay(state);
  }

  private _renderScreen(state: GameState): void {
    const screenArea = this._uiEl?.querySelector<HTMLElement>('#screen-area');
    if (!screenArea) return;

    switch (this._activeTab) {
      case 'home':      screenArea.innerHTML = renderHome(state);      break;
      case 'brigade':   screenArea.innerHTML = renderBrigade(state);   break;
      case 'contracts': screenArea.innerHTML = renderContracts(state); break;
      case 'upgrades':  screenArea.innerHTML = renderUpgrades(state);  break;
    }
  }

  private _renderEventOverlay(state: GameState): void {
    const ui = this._uiEl;
    if (!ui) return;

    // Remove existing overlay
    const existing = ui.querySelector('#event-overlay');
    if (existing) existing.remove();

    if (state.activeEvents.length === 0) return;

    const ev: ActiveEventState = state.activeEvents[0];
    const overlayHTML = renderEventOverlay(ev, (i) => {
      this._gm.resolveEvent(ev.instanceId, i);
    });

    // Append overlay inside game-ui
    const tmp = document.createElement('div');
    tmp.innerHTML = overlayHTML;
    const overlayEl = tmp.firstElementChild as HTMLElement | null;
    if (!overlayEl) return;

    // Wire option buttons
    overlayEl.querySelectorAll<HTMLButtonElement>('.event-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.opt ?? '0', 10);
        this._gm.resolveEvent(ev.instanceId, idx);
      });
    });

    ui.appendChild(overlayEl);
  }

  // ─────────────────────────────────────────────────────────
  // Tab switching

  private _switchTab(tab: TabId): void {
    this._activeTab = tab;

    // Update active styling
    this._uiEl?.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Re-render screen content
    this._renderScreen(this._gm.state);
  }

  // ─────────────────────────────────────────────────────────
  // Delegated click handler for screen area buttons

  private _handleScreenClick(e: Event): void {
    const target = e.target as HTMLElement;

    // "Take contract" stub button
    if (target.id === 'btn-take-contract' || target.closest('#btn-take-contract')) {
      // For MVP: take the first available contract, or show a stub alert
      const available = this._gm.projects.getAvailableContracts(this._gm.state);
      if (available.length > 0) {
        this._gm.takeContract(available[0].id);
      } else {
        this._gm.addLog('📋 Нет доступных контрактов. Повысьте уровень компании.');
        this._gm['notify' as keyof GameManager]; // trigger refresh via notify
        // Force a UI refresh manually
        GameManager.onStateChanged.forEach((cb) => cb(this._gm.state));
      }
    }

    // "Submit documents" button
    if (target.id === 'btn-submit-docs' || target.closest('#btn-submit-docs')) {
      this._gm.submitDocuments();
    }

    // "Sign KS-2" button
    if (target.id === 'btn-sign-ks2' || target.closest('#btn-sign-ks2')) {
      this._gm.signKS2();
    }
  }

  // ─────────────────────────────────────────────────────────
  // Game over

  private _showGameOver(): void {
    const ui = this._uiEl;
    if (!ui) return;

    const state = this._gm.state;
    const overlay = document.createElement('div');
    overlay.id = 'gameover-overlay';
    overlay.innerHTML = `
      <div id="gameover-popup">
        <div style="font-size:48px;text-align:center">💀</div>
        <h2 style="text-align:center;margin:12px 0 8px">Нервный срыв</h2>
        <p style="text-align:center;color:var(--text-dim);margin-bottom:20px">
          Вы бросили стройку и открыли шаурмячную.<br>Говорят, там лучше.
        </p>
        <div class="stat-row"><span class="stat-label">Дней прожито</span><span class="stat-value">${state.day}</span></div>
        <div class="stat-row"><span class="stat-label">Проектов сдано</span><span class="stat-value">${state.completedProjects.length}</span></div>
        <div class="stat-row"><span class="stat-label">Всего заработано</span><span class="stat-value good">${state.totalEarned.toLocaleString('ru')} ₽</span></div>
        <button class="btn btn-primary btn-full" id="btn-restart" style="margin-top:20px">🔄 Начать заново</button>
      </div>
    `;

    // Inline styles for overlay (CSS vars already injected)
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.85);
      display:flex;align-items:center;justify-content:center;z-index:200;
    `;
    const popup = overlay.querySelector('#gameover-popup') as HTMLElement;
    popup.style.cssText = `
      background:var(--surface);border-radius:var(--radius);padding:28px 20px;
      max-width:360px;width:90%;
    `;

    overlay.querySelector('#btn-restart')?.addEventListener('click', () => {
      // Clear save and reload
      localStorage.removeItem('stroyka_save_v1');
      window.location.reload();
    });

    ui.appendChild(overlay);
  }

  // ─────────────────────────────────────────────────────────
  // Inject CSS into document <head>

  private _injectCSS(): void {
    if (this._styleEl) return;
    this._styleEl = document.createElement('style');
    this._styleEl.textContent = CSS;
    document.head.appendChild(this._styleEl);
  }

  // ─────────────────────────────────────────────────────────
  // Clean up when scene is destroyed

  shutdown(): void {
    this._gm?.stop();
    this._styleEl?.remove();
    this._styleEl = null;
  }
}
