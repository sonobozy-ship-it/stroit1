import { createCanvas } from 'canvas';
import fs from 'fs';

const mkdir = (p) => fs.mkdirSync(p, { recursive: true });
mkdir('public');
mkdir('screenshots');

// ── Palette ──────────────────────────────────────────────
const BG       = '#1a1a2e';
const SURFACE  = '#16213e';
const SURFACE2 = '#0f3460';
const ACCENT   = '#e94560';
const ACCENT2  = '#f5a623';
const TEXT     = '#eaeaea';
const DIM      = '#8a8a9a';
const GREEN    = '#4caf50';
const RED      = '#e94560';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── ICON 512x512 ─────────────────────────────────────────
function makeIcon(size) {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');
  const s = size / 512;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#1a1a2e');
  grad.addColorStop(1, '#0f3460');
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, size, size, 80 * s);
  ctx.fill();

  // Crane arm
  ctx.strokeStyle = ACCENT2;
  ctx.lineWidth = 14 * s;
  ctx.lineCap = 'round';

  // Vertical mast
  ctx.beginPath();
  ctx.moveTo(200 * s, 400 * s);
  ctx.lineTo(200 * s, 120 * s);
  ctx.stroke();

  // Horizontal jib
  ctx.beginPath();
  ctx.moveTo(120 * s, 140 * s);
  ctx.lineTo(390 * s, 140 * s);
  ctx.stroke();

  // Counter jib
  ctx.beginPath();
  ctx.moveTo(120 * s, 140 * s);
  ctx.lineTo(120 * s, 180 * s);
  ctx.stroke();

  // Hook cable
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 6 * s;
  ctx.beginPath();
  ctx.moveTo(340 * s, 140 * s);
  ctx.lineTo(340 * s, 270 * s);
  ctx.stroke();

  // Hook
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 10 * s;
  ctx.beginPath();
  ctx.arc(340 * s, 285 * s, 16 * s, 0, Math.PI * 1.5);
  ctx.stroke();

  // Building blocks
  const blocks = [
    [100, 320, 90, 80, '#16213e', '#e94560'],
    [200, 290, 80, 110, '#16213e', '#f5a623'],
    [290, 340, 110, 60, '#16213e', '#4caf50'],
  ];
  for (const [x, y, w, h, fill, border] of blocks) {
    ctx.fillStyle = fill;
    roundRect(ctx, x * s, y * s, w * s, h * s, 8 * s);
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 3 * s;
    roundRect(ctx, x * s, y * s, w * s, h * s, 8 * s);
    ctx.stroke();

    // Window
    ctx.fillStyle = border + '55';
    roundRect(ctx, (x + 15) * s, (y + 15) * s, 20 * s, 20 * s, 4 * s);
    ctx.fill();
  }

  // Ground line
  ctx.strokeStyle = SURFACE2;
  ctx.lineWidth = 4 * s;
  ctx.beginPath();
  ctx.moveTo(80 * s, 400 * s);
  ctx.lineTo(432 * s, 400 * s);
  ctx.stroke();

  // App name
  ctx.fillStyle = TEXT;
  ctx.font = `bold ${62 * s}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('СТРОЙКА', 256 * s, 470 * s);

  return c;
}

const icon512 = makeIcon(512);
fs.writeFileSync('public/icon-512.png', icon512.toBuffer('image/png'));
const icon192 = makeIcon(192);
fs.writeFileSync('public/icon-192.png', icon192.toBuffer('image/png'));
console.log('✓ Icons generated');

// ── SCREENSHOT 390x844 (iPhone-like mobile) ──────────────
function makeScreenshot() {
  const W = 390, H = 844;
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // ── HUD ──
  ctx.fillStyle = SURFACE;
  ctx.fillRect(0, 0, W, 100);
  ctx.strokeStyle = SURFACE2;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 100); ctx.lineTo(W, 100); ctx.stroke();

  ctx.fillStyle = TEXT;
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('🏗️ ИП Строй-Мастер', 16, 26);

  ctx.fillStyle = DIM;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('День 14', W - 16, 26);

  ctx.fillStyle = ACCENT2;
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('₽ 127 500', 16, 54);

  // Stress bar
  ctx.fillStyle = DIM;
  ctx.font = '11px sans-serif';
  ctx.fillText('😤 Стресс 32%', 16, 75);
  ctx.fillStyle = SURFACE2;
  roundRect(ctx, 16, 80, 160, 6, 3); ctx.fill();
  ctx.fillStyle = RED;
  roundRect(ctx, 16, 80, 51, 6, 3); ctx.fill();

  // Rep bar
  ctx.fillStyle = DIM;
  ctx.font = '11px sans-serif';
  ctx.fillText('⭐ Репутация 65%', 200, 75);
  ctx.fillStyle = SURFACE2;
  roundRect(ctx, 200, 80, 174, 6, 3); ctx.fill();
  ctx.fillStyle = GREEN;
  roundRect(ctx, 200, 80, 113, 6, 3); ctx.fill();

  // ── TAB BAR ──
  const tabH = 60;
  ctx.fillStyle = SURFACE;
  ctx.fillRect(0, H - tabH, W, tabH);
  ctx.strokeStyle = SURFACE2;
  ctx.beginPath(); ctx.moveTo(0, H - tabH); ctx.lineTo(W, H - tabH); ctx.stroke();

  const tabs = [['🏠', 'Главная'], ['👷', 'Бригада'], ['📋', 'Контракты'], ['🔧', 'Апгрейды']];
  tabs.forEach(([icon, label], i) => {
    const x = (W / 4) * i + W / 8;
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = i === 0 ? ACCENT : DIM;
    ctx.fillText(icon, x, H - tabH + 24);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = i === 0 ? ACCENT : DIM;
    ctx.fillText(label, x, H - tabH + 44);
  });

  // ── CONTENT AREA ──
  const contentY = 110;
  const contentH = H - tabH - contentY;
  const pad = 16;

  // Company stats card
  ctx.fillStyle = SURFACE;
  roundRect(ctx, pad, contentY + pad, W - pad * 2, 110, 12); ctx.fill();

  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'left';
  ctx.fillText('📊 Компания', pad + 14, contentY + pad + 26);

  const stats = [
    ['Уровень компании', '2', TEXT],
    ['Связи', '45', TEXT],
    ['Всего заработано', '₽ 890 000', GREEN],
    ['Проектов завершено', '3', TEXT],
  ];
  stats.forEach(([label, val, color], i) => {
    const y = contentY + pad + 46 + i * 17;
    ctx.font = '12px sans-serif';
    ctx.fillStyle = DIM;
    ctx.textAlign = 'left';
    ctx.fillText(label, pad + 14, y);
    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.fillText(val, W - pad - 14, y);
  });

  // Active project card
  const projY = contentY + pad + 130;
  ctx.fillStyle = SURFACE;
  roundRect(ctx, pad, projY, W - pad * 2, 150, 12); ctx.fill();

  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'left';
  ctx.fillText('🏢 Офис в центре (60м²)', pad + 14, projY + 26);

  ctx.fillStyle = SURFACE2;
  roundRect(ctx, pad + 14, projY + 36, 110, 20, 10); ctx.fill();
  ctx.font = '12px sans-serif';
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'left';
  ctx.fillText('🏗️ Строительство', pad + 22, projY + 50);

  // Progress bar
  ctx.fillStyle = SURFACE2;
  roundRect(ctx, pad + 14, projY + 68, W - pad * 2 - 28, 8, 4); ctx.fill();
  const gradProg = ctx.createLinearGradient(pad + 14, 0, W - pad - 14, 0);
  gradProg.addColorStop(0, ACCENT2);
  gradProg.addColorStop(1, ACCENT);
  ctx.fillStyle = gradProg;
  roundRect(ctx, pad + 14, projY + 68, (W - pad * 2 - 28) * 0.58, 8, 4); ctx.fill();

  ctx.font = '12px sans-serif';
  ctx.fillStyle = DIM;
  ctx.textAlign = 'left';
  ctx.fillText('Прогресс: 58%', pad + 14, projY + 94);
  ctx.textAlign = 'right';
  ctx.fillText('Клиент: Иванов А.', W - pad - 14, projY + 94);

  const projStats = [
    ['Дедлайн', 'через 8 дн.', GREEN],
    ['Контракт', '₽ 850 000', TEXT],
    ['Аванс получен', '₽ 255 000', GREEN],
  ];
  projStats.forEach(([label, val, color], i) => {
    const y = projY + 114 + i * 14;
    ctx.font = '12px sans-serif';
    ctx.fillStyle = DIM;
    ctx.textAlign = 'left';
    ctx.fillText(label, pad + 14, y);
    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.fillText(val, W - pad - 14, y);
  });

  // Log card
  const logY = projY + 168;
  ctx.fillStyle = SURFACE;
  roundRect(ctx, pad, logY, W - pad * 2, 135, 12); ctx.fill();

  ctx.font = 'bold 15px sans-serif';
  ctx.fillStyle = TEXT;
  ctx.textAlign = 'left';
  ctx.fillText('📝 Журнал', pad + 14, logY + 26);

  const logs = [
    '✅ День 14: прогресс +4%',
    '💰 Зарплата выплачена: -₽ 18 500',
    '⚠️ Василий снова опоздал',
    '📋 Клиент запросил фото объекта',
    '🏗️ Закупка бетона завершена',
  ];
  logs.forEach((msg, i) => {
    ctx.font = '12px sans-serif';
    ctx.fillStyle = i === 2 ? '#f5a623' : DIM;
    ctx.textAlign = 'left';
    ctx.fillText(msg, pad + 14, logY + 46 + i * 18);
    if (i < logs.length - 1) {
      ctx.strokeStyle = SURFACE2;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad + 14, logY + 52 + i * 18);
      ctx.lineTo(W - pad - 14, logY + 52 + i * 18);
      ctx.stroke();
    }
  });

  return c;
}

const ss = makeScreenshot();
fs.writeFileSync('screenshots/home-screen.png', ss.toBuffer('image/png'));
console.log('✓ Screenshot generated');

// ── EVENT POPUP screenshot ────────────────────────────────
function makeEventScreenshot() {
  const W = 390, H = 844;
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');

  // Background (blurred game behind)
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Dim overlay
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, W, H);

  // Popup sheet (bottom sheet style)
  const popupH = 420;
  const popupY = H - popupH;
  ctx.fillStyle = SURFACE;
  roundRect(ctx, 0, popupY, W, popupH, 20); ctx.fill();

  // Emoji
  ctx.font = '52px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🍺', W / 2, popupY + 68);

  // Title
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = TEXT;
  ctx.fillText('Рабочий ушёл в запой', W / 2, popupY + 110);

  // Description
  ctx.font = '14px sans-serif';
  ctx.fillStyle = DIM;
  const desc = 'Василий исчез с объекта на третий день. Соседи видели его у пивного ларька.';
  // word wrap manually
  const words = desc.split(' ');
  let line = '', lines = [];
  for (const w of words) {
    const test = line + (line ? ' ' : '') + w;
    if (ctx.measureText(test).width > W - 64) { lines.push(line); line = w; }
    else line = test;
  }
  lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, W / 2, popupY + 140 + i * 20));

  // Options
  const options = [
    { label: '🔍 Найти временного рабочего', cost: '-₽ 15 000', color: SURFACE2 },
    { label: '📺 Найти бесплатно (реклама)', cost: '📺 Реклама', color: '#1a2a4e' },
    { label: '😤 Работать без него', cost: 'Эфф. бригады -20%', color: SURFACE2 },
  ];

  options.forEach((opt, i) => {
    const y = popupY + 200 + i * 68;
    ctx.fillStyle = opt.color;
    roundRect(ctx, 16, y, W - 32, 56, 10); ctx.fill();

    ctx.font = '14px sans-serif';
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'left';
    ctx.fillText(opt.label, 30, y + 24);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = ACCENT2;
    ctx.fillText(opt.cost, 30, y + 42);
  });

  return c;
}

const evSS = makeEventScreenshot();
fs.writeFileSync('screenshots/event-popup.png', evSS.toBuffer('image/png'));
console.log('✓ Event popup screenshot generated');

// ── FEATURE BANNER 1280x640 ───────────────────────────────
function makeBanner() {
  const W = 1280, H = 640;
  const c = createCanvas(W, H);
  const ctx = c.getContext('2d');

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#0a0a1a');
  grad.addColorStop(0.5, '#1a1a2e');
  grad.addColorStop(1, '#0f1a30');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Left: phone mockup
  const phoneW = 240, phoneH = 480;
  const phoneX = 80, phoneY = (H - phoneH) / 2;

  // Phone shell
  ctx.fillStyle = '#0d0d1f';
  roundRect(ctx, phoneX, phoneY, phoneW, phoneH, 30); ctx.fill();
  ctx.strokeStyle = '#2a2a4e';
  ctx.lineWidth = 2;
  roundRect(ctx, phoneX, phoneY, phoneW, phoneH, 30); ctx.stroke();

  // Phone screen
  const scrPad = 10;
  ctx.fillStyle = BG;
  roundRect(ctx, phoneX + scrPad, phoneY + scrPad, phoneW - scrPad * 2, phoneH - scrPad * 2, 22);
  ctx.fill();

  // Mini HUD on phone
  ctx.fillStyle = SURFACE;
  ctx.fillRect(phoneX + scrPad, phoneY + scrPad, phoneW - scrPad * 2, 45);
  ctx.font = 'bold 9px sans-serif';
  ctx.fillStyle = ACCENT2;
  ctx.textAlign = 'left';
  ctx.fillText('₽ 127 500', phoneX + scrPad + 8, phoneY + scrPad + 28);
  ctx.fillStyle = DIM;
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('День 14', phoneX + phoneW - scrPad - 8, phoneY + scrPad + 28);

  // Mini cards on phone
  [[0,'🏢 Офис 60м²', '58%', ACCENT2], [1,'👷 Бригада: 4 чел', '3 активны', GREEN]].forEach(([i, title, sub, color]) => {
    const cy = phoneY + scrPad + 58 + Number(i) * 90;
    ctx.fillStyle = SURFACE;
    roundRect(ctx, phoneX + scrPad + 6, cy, phoneW - scrPad * 2 - 12, 78, 8); ctx.fill();
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = TEXT;
    ctx.textAlign = 'left';
    ctx.fillText(String(title), phoneX + scrPad + 14, cy + 20);
    ctx.font = '8px sans-serif';
    ctx.fillStyle = color;
    ctx.fillText(String(sub), phoneX + scrPad + 14, cy + 36);
    // Mini progress bar
    ctx.fillStyle = SURFACE2;
    roundRect(ctx, phoneX + scrPad + 14, cy + 48, phoneW - scrPad * 2 - 28, 5, 2); ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx, phoneX + scrPad + 14, cy + 48, (phoneW - scrPad * 2 - 28) * 0.58, 5, 2); ctx.fill();
  });

  // Tab bar on phone
  ctx.fillStyle = SURFACE;
  ctx.fillRect(phoneX + scrPad, phoneY + phoneH - scrPad - 36, phoneW - scrPad * 2, 36);
  ['🏠','👷','📋','🔧'].forEach((ico, i) => {
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = i === 0 ? ACCENT : DIM;
    ctx.fillText(ico, phoneX + scrPad + (phoneW - scrPad * 2) / 4 * i + (phoneW - scrPad * 2) / 8, phoneY + phoneH - scrPad - 14);
  });

  // Right: text
  const textX = 380;

  ctx.font = 'bold 14px sans-serif';
  ctx.fillStyle = ACCENT;
  ctx.textAlign = 'left';
  ctx.fillText('МОБИЛЬНАЯ ИГРА', textX, 160);

  ctx.font = 'bold 72px sans-serif';
  ctx.fillStyle = TEXT;
  ctx.fillText('СТРОЙКА', textX, 260);

  ctx.font = '24px sans-serif';
  ctx.fillStyle = DIM;
  ctx.fillText('без иллюзий', textX, 300);

  ctx.font = '16px sans-serif';
  ctx.fillStyle = TEXT;
  const features = [
    '🏗️  Управляй строительной компанией',
    '👷  Нанимай рабочих — но следи за запоями',
    '📋  Бюрократия, штрафы и злые клиенты',
    '💰  Кредиты, аванс, ожидание оплаты',
    '⚡  Случайные события каждый день',
  ];
  features.forEach((f, i) => {
    ctx.fillText(f, textX, 360 + i * 34);
  });

  // Tech stack pills
  const pills = ['Phaser.js', 'TypeScript', 'Capacitor', 'Android APK'];
  let px = textX;
  pills.forEach(pill => {
    const tw = ctx.measureText(pill).width + 24;
    ctx.fillStyle = SURFACE2;
    roundRect(ctx, px, 545, tw, 28, 14); ctx.fill();
    ctx.strokeStyle = ACCENT + '66';
    ctx.lineWidth = 1;
    roundRect(ctx, px, 545, tw, 28, 14); ctx.stroke();
    ctx.font = '13px sans-serif';
    ctx.fillStyle = ACCENT2;
    ctx.textAlign = 'center';
    ctx.fillText(pill, px + tw / 2, 564);
    ctx.textAlign = 'left';
    px += tw + 10;
  });

  return c;
}

const banner = makeBanner();
fs.writeFileSync('screenshots/banner.png', banner.toBuffer('image/png'));
console.log('✓ Banner generated');
console.log('\nAll images saved:');
console.log('  public/icon-192.png');
console.log('  public/icon-512.png');
console.log('  screenshots/home-screen.png');
console.log('  screenshots/event-popup.png');
console.log('  screenshots/banner.png');
