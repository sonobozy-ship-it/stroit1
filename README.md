# Стройка без иллюзий

Симулятор управления строительной компанией. Мобильная игра (Android).

## Технологии

| Слой | Технология |
|---|---|
| Игровой движок | Phaser.js 3 + TypeScript |
| UI | HTML/CSS (Phaser DOM) |
| Упаковка APK | Capacitor 7 |
| Сборка | GitHub Actions |
| Сохранение | localStorage |

## Быстрый старт

```bash
cd web
npm install
npm run dev        # http://localhost:3000
npm run build      # production build в web/dist/
```

## Сборка APK

### Через GitHub Actions (рекомендуется)

1. В настройках репозитория добавить **Secrets**:

| Secret | Значение |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | содержимое файла `web/stroyka-keystore-base64.txt` |
| `KEYSTORE_PASS` | `stroyka2024` |
| `KEY_ALIAS` | `stroyka` |
| `KEY_PASS` | `stroyka2024` |

2. `Actions → Build Android APK → Run workflow`
3. Скачать артефакт `Stroyka-release` → `app-release.apk`

### Локально

```bash
cd web
npm run build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

> Нужны: Java 17+, Android SDK (API 34), Node 18+

## Структура проекта

```
web/
├── src/
│   ├── main.ts                 ← точка входа Phaser
│   ├── scenes/
│   │   ├── BootScene.ts        ← загрузочный экран
│   │   └── GameScene.ts        ← главная сцена + UI
│   ├── systems/
│   │   ├── GameState.ts        ← типы и интерфейсы
│   │   ├── GameManager.ts      ← тик-цикл, API для UI
│   │   ├── FinanceSystem.ts    ← финансы, кредиты, выплаты
│   │   ├── WorkerSystem.ts     ← найм/увольнение, запои
│   │   ├── ProjectSystem.ts    ← фазы проекта, КС-2
│   │   ├── EventSystem.ts      ← случайные события
│   │   ├── DocumentSystem.cs   ← мини-игра с документами
│   │   ├── ClientRelationsSystem.ts
│   │   ├── ProgressionSystem.ts
│   │   ├── ForemanTheftSystem.ts
│   │   ├── BattlePassSystem.ts
│   │   └── SaveSystem.ts       ← localStorage
│   ├── data/
│   │   ├── contracts.ts        ← 8 типов контрактов
│   │   ├── workers.ts          ← 8 типов рабочих
│   │   └── events.ts           ← 12 случайных событий
│   └── ui/
│       ├── screens.ts          ← HTML-шаблоны экранов
│       └── styles.ts           ← CSS
├── capacitor.config.json
└── package.json

Assets/Scripts/                 ← оригинальный Unity C# код (reference)
docs/stroyka-gdd.md             ← игровой дизайн-документ
```

## Игровой цикл

```
Каждые 3 сек (= 1 игровой день):
  → WorkerSystem.processTick   — запои, уходы, выздоровление
  → FinanceSystem.processTick  — зарплаты, кредиты, выплаты
  → ProjectSystem.processTick  — прогресс, дедлайны, фазы
  → EventSystem.processTick    — генерация/истечение событий
  → ForemanTheftSystem         — воровство прораба
  → checkGameOver              — стресс >= 100?
```

## Архитектура C# (Unity, reference)

Оригинальный Unity-проект сохранён в `Assets/Scripts/` как reference.
Весь игровой логический код портирован в TypeScript без изменений.
