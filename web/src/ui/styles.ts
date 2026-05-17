export const CSS = `
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --bg:       #1a1a2e;
    --surface:  #16213e;
    --surface2: #0f3460;
    --accent:   #e94560;
    --accent2:  #f5a623;
    --text:     #eaeaea;
    --dim:      #8a8a9a;
    --green:    #4caf50;
    --red:      #e94560;
    --yellow:   #f5a623;
    --radius:   12px;
    /* safe areas for Android notch / gesture bar */
    --sat: env(safe-area-inset-top,    0px);
    --sar: env(safe-area-inset-right,  0px);
    --sab: env(safe-area-inset-bottom, 0px);
    --sal: env(safe-area-inset-left,   0px);
  }

  html, body {
    width: 100%; height: 100%;
    overflow: hidden;
    background: var(--bg);
    touch-action: manipulation;
  }

  /* Phaser canvas hidden behind UI */
  #game-container canvas { display: none; }

  /* ── Root UI ── */
  #game-ui {
    position: fixed;
    top: 0; right: 0; bottom: 0; left: 0;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: var(--text);
    font-size: clamp(13px, 3.5vw, 16px);
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    /* safe area padding */
    padding-top: var(--sat);
    padding-right: var(--sar);
    padding-bottom: var(--sab);
    padding-left: var(--sal);
  }

  /* ── HUD ── */
  #hud {
    flex-shrink: 0;
    background: var(--surface);
    padding: 10px 16px 8px;
    border-bottom: 1px solid var(--surface2);
  }
  #hud-row1 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
  }
  #company-name { font-weight: 700; font-size: 1em; }
  #day-counter  { color: var(--dim); font-size: 0.85em; }
  #money        { font-size: 1.3em; font-weight: 700; color: var(--accent2); margin-bottom: 6px; }
  #hud-meters   { display: flex; gap: 10px; }
  .meter        { flex: 1; }
  .meter-label  { font-size: 0.72em; color: var(--dim); margin-bottom: 2px; }
  .meter-bar    { height: 5px; border-radius: 3px; background: var(--surface2); overflow: hidden; }
  .meter-fill   { height: 100%; border-radius: 3px; transition: width 0.4s; }
  .meter-fill.stress { background: var(--red); }
  .meter-fill.rep    { background: var(--green); }

  /* ── Screen area ── */
  #screen-area {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    padding: 12px 14px;
  }

  /* ── Tab bar ── */
  #tab-bar {
    flex-shrink: 0;
    display: flex;
    background: var(--surface);
    border-top: 1px solid var(--surface2);
  }
  .tab-btn {
    flex: 1;
    padding: 8px 2px 6px;
    background: none;
    border: none;
    color: var(--dim);
    font-size: 0.72em;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    transition: color 0.15s;
    -webkit-tap-highlight-color: transparent;
  }
  .tab-btn .tab-icon { font-size: 1.6em; line-height: 1; }
  .tab-btn.active    { color: var(--accent); }

  /* ── Card ── */
  .card {
    background: var(--surface);
    border-radius: var(--radius);
    padding: 12px 14px;
    margin-bottom: 10px;
  }
  .card-title    { font-weight: 600; font-size: 1em; margin-bottom: 8px; }
  .card-subtitle { color: var(--dim); font-size: 0.8em; }

  /* ── Progress bar ── */
  .progress-bar  { height: 7px; background: var(--surface2); border-radius: 4px; overflow: hidden; margin: 6px 0; }
  .progress-fill {
    height: 100%; border-radius: 4px;
    background: linear-gradient(90deg, var(--accent2), var(--accent));
    transition: width 0.5s;
  }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    padding: 11px 18px;
    border-radius: 10px; border: none;
    font-size: 0.9em; font-weight: 600;
    cursor: pointer; transition: opacity 0.15s;
  }
  .btn:active    { opacity: 0.65; }
  .btn-primary   { background: var(--accent);   color: #fff; }
  .btn-secondary { background: var(--surface2); color: var(--text); }
  .btn-full      { width: 100%; }

  /* ── Stat row ── */
  .stat-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 6px 0;
    border-bottom: 1px solid var(--surface2);
    font-size: 0.85em;
  }
  .stat-row:last-child { border-bottom: none; }
  .stat-label { color: var(--dim); }
  .stat-value { font-weight: 600; }
  .stat-value.good { color: var(--green); }
  .stat-value.bad  { color: var(--red);   }

  /* ── Worker card ── */
  .worker-card {
    display: flex; align-items: center; gap: 10px;
    background: var(--surface);
    border-radius: var(--radius); padding: 10px 12px; margin-bottom: 8px;
  }
  .worker-emoji { font-size: 1.8em; flex-shrink: 0; }
  .worker-info  { flex: 1; min-width: 0; }
  .worker-name  { font-weight: 600; font-size: 0.9em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .worker-stats { color: var(--dim); font-size: 0.75em; margin-top: 2px; }
  .badge        { font-size: 0.7em; padding: 2px 7px; border-radius: 20px; background: var(--surface2); white-space: nowrap; }
  .badge.binge  { background: #7c3aed22; color: #a78bfa; }
  .badge.away   { background: #d9770622; color: var(--yellow); }

  /* ── Phase badge ── */
  .phase-badge {
    display: inline-block; font-size: 0.75em;
    padding: 3px 10px; border-radius: 20px;
    background: var(--surface2); margin-bottom: 8px;
  }

  /* ── Log ── */
  .log-entry {
    font-size: 0.78em; color: var(--dim);
    padding: 4px 0; border-bottom: 1px solid var(--surface2);
    line-height: 1.3;
  }
  .log-entry:last-child { border-bottom: none; }

  /* ── Empty state ── */
  .empty-state { text-align: center; padding: 32px 20px; color: var(--dim); }
  .empty-state .empty-icon  { font-size: 3em; margin-bottom: 10px; }
  .empty-state .empty-title { font-size: 1em; font-weight: 600; color: var(--text); margin-bottom: 6px; }
  .empty-state p            { font-size: 0.85em; line-height: 1.4; }

  /* ── Event overlay ── */
  #event-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.78);
    display: flex; align-items: flex-end;
    z-index: 100;
    padding-bottom: var(--sab);
  }
  #event-popup {
    background: var(--surface);
    border-radius: var(--radius) var(--radius) 0 0;
    padding: 20px 16px 24px;
    width: 100%;
    max-height: 80dvh;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }
  .event-emoji { font-size: 2.5em; text-align: center; margin-bottom: 6px; }
  .event-title { font-size: 1.1em; font-weight: 700; text-align: center; margin-bottom: 6px; }
  .event-desc  { color: var(--dim); text-align: center; margin-bottom: 14px; font-size: 0.85em; line-height: 1.4; }
  .event-option {
    display: block; width: 100%; text-align: left;
    background: var(--surface2); border: none; border-radius: 10px;
    padding: 11px 14px; color: var(--text);
    font-size: 0.9em; margin-bottom: 8px; cursor: pointer;
  }
  .event-option:active { opacity: 0.65; }
  .event-option .opt-cost { font-size: 0.78em; color: var(--yellow); margin-top: 2px; }

  /* ── Game over overlay ── */
  #gameover-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.88);
    display: flex; align-items: center; justify-content: center;
    z-index: 200;
    padding: 20px;
  }
  #gameover-popup {
    background: var(--surface);
    border-radius: var(--radius); padding: 28px 20px;
    width: 100%; max-width: 380px;
  }
  #gameover-popup h2 { text-align: center; margin: 12px 0 8px; }
  #gameover-popup p  { text-align: center; color: var(--dim); margin-bottom: 20px; font-size: 0.85em; line-height: 1.4; }

  /* ── Contract list ── */
  .contract-card {
    background: var(--surface); border-radius: var(--radius);
    padding: 12px 14px; margin-bottom: 8px; cursor: pointer;
    border: 2px solid transparent; transition: border-color 0.15s;
  }
  .contract-card:active { border-color: var(--accent); }
  .contract-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; }
  .contract-name   { font-weight: 600; font-size: 0.95em; }
  .contract-value  { font-weight: 700; color: var(--accent2); font-size: 0.95em; white-space: nowrap; }
  .contract-meta   { color: var(--dim); font-size: 0.75em; }
  .diff-badge      { display: inline-block; font-size: 0.7em; padding: 2px 8px; border-radius: 20px; margin-left: 6px; }
  .diff-Easy       { background: #4caf5022; color: var(--green); }
  .diff-Medium     { background: #f5a62322; color: var(--yellow); }
  .diff-Hard       { background: #e9456022; color: var(--red); }
  .diff-Expert     { background: #a78bfa22; color: #a78bfa; }
`;
