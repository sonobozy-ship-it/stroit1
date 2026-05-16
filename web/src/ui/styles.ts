export const CSS = `
  :root {
    --bg: #1a1a2e;
    --surface: #16213e;
    --surface2: #0f3460;
    --accent: #e94560;
    --accent2: #f5a623;
    --text: #eaeaea;
    --text-dim: #8a8a9a;
    --green: #4caf50;
    --red: #e94560;
    --yellow: #f5a623;
    --radius: 12px;
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
  }

  #game-ui {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--text);
    font-size: 14px;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    padding-top: var(--safe-top);
    padding-bottom: var(--safe-bottom);
  }

  /* HUD */
  #hud {
    background: var(--surface);
    padding: 10px 16px 8px;
    border-bottom: 1px solid var(--surface2);
    flex-shrink: 0;
  }
  #hud-row1 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  #company-name { font-weight: 700; font-size: 15px; }
  #day-counter { color: var(--text-dim); font-size: 13px; }
  #money { font-size: 18px; font-weight: 700; color: var(--accent2); }
  #hud-meters { display: flex; gap: 12px; }
  .meter { flex: 1; }
  .meter-label { font-size: 11px; color: var(--text-dim); margin-bottom: 2px; }
  .meter-bar { height: 6px; border-radius: 3px; background: var(--surface2); overflow: hidden; }
  .meter-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }
  .meter-fill.stress { background: var(--red); }
  .meter-fill.rep { background: var(--green); }

  /* Screen area */
  #screen-area {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    -webkit-overflow-scrolling: touch;
  }

  /* Tab bar */
  #tab-bar {
    display: flex;
    background: var(--surface);
    border-top: 1px solid var(--surface2);
    flex-shrink: 0;
  }
  .tab-btn {
    flex: 1;
    padding: 10px 4px 8px;
    background: none;
    border: none;
    color: var(--text-dim);
    font-size: 11px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    transition: color 0.15s;
  }
  .tab-btn .tab-icon { font-size: 20px; }
  .tab-btn.active { color: var(--accent); }

  /* Cards */
  .card {
    background: var(--surface);
    border-radius: var(--radius);
    padding: 14px;
    margin-bottom: 12px;
  }
  .card-title {
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 8px;
  }
  .card-subtitle { color: var(--text-dim); font-size: 12px; }

  /* Progress bar */
  .progress-bar {
    height: 8px;
    background: var(--surface2);
    border-radius: 4px;
    overflow: hidden;
    margin: 6px 0;
  }
  .progress-fill {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--accent2), var(--accent));
    transition: width 0.5s;
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 18px;
    border-radius: 10px;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .btn:active { opacity: 0.7; }
  .btn-primary { background: var(--accent); color: #fff; }
  .btn-secondary { background: var(--surface2); color: var(--text); }
  .btn-full { width: 100%; }

  /* Worker card */
  .worker-card {
    display: flex;
    align-items: center;
    gap: 12px;
    background: var(--surface);
    border-radius: var(--radius);
    padding: 12px;
    margin-bottom: 8px;
  }
  .worker-emoji { font-size: 28px; }
  .worker-info { flex: 1; }
  .worker-name { font-weight: 600; }
  .worker-stats { color: var(--text-dim); font-size: 12px; margin-top: 2px; }
  .badge {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 20px;
    background: var(--surface2);
  }
  .badge.binge { background: #7c3aed22; color: #a78bfa; }
  .badge.away { background: #d9770622; color: var(--yellow); }

  /* Log */
  .log-entry {
    font-size: 12px;
    color: var(--text-dim);
    padding: 4px 0;
    border-bottom: 1px solid var(--surface2);
  }
  .log-entry:last-child { border-bottom: none; }

  /* Event overlay */
  #event-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.75);
    display: flex;
    align-items: flex-end;
    z-index: 100;
  }
  #event-popup {
    background: var(--surface);
    border-radius: var(--radius) var(--radius) 0 0;
    padding: 20px 16px 32px;
    width: 100%;
    max-height: 85vh;
    overflow-y: auto;
  }
  .event-emoji { font-size: 40px; text-align: center; margin-bottom: 8px; }
  .event-title { font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 8px; }
  .event-desc { color: var(--text-dim); text-align: center; margin-bottom: 16px; line-height: 1.4; }
  .event-option {
    display: block;
    width: 100%;
    text-align: left;
    background: var(--surface2);
    border: none;
    border-radius: 10px;
    padding: 12px 16px;
    color: var(--text);
    font-size: 14px;
    margin-bottom: 8px;
    cursor: pointer;
  }
  .event-option:active { opacity: 0.7; }
  .event-option .opt-cost { font-size: 12px; color: var(--yellow); margin-top: 2px; }

  /* Phase badge */
  .phase-badge {
    display: inline-block;
    font-size: 12px;
    padding: 3px 10px;
    border-radius: 20px;
    background: var(--surface2);
    margin-bottom: 8px;
  }

  /* Stat row */
  .stat-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid var(--surface2);
    font-size: 13px;
  }
  .stat-row:last-child { border-bottom: none; }
  .stat-label { color: var(--text-dim); }
  .stat-value { font-weight: 600; }
  .stat-value.good { color: var(--green); }
  .stat-value.bad { color: var(--red); }

  /* Empty state */
  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-dim);
  }
  .empty-state .empty-icon { font-size: 48px; margin-bottom: 12px; }
  .empty-state .empty-title { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 8px; }
`;
