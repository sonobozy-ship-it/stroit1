# Стройка без иллюзий — Unity Project

## Setup

1. Open in **Unity 2022.3 LTS**
2. Open `Assets/Scenes/Main.unity`
3. Hit Play

## Architecture

```
Assets/Scripts/
├── Core/
│   ├── GameManager.cs       ← singleton, tick loop, public action API
│   ├── GameState.cs         ← all serializable state types
│   └── SaveSystem.cs        ← JSON save/load via PlayerPrefs
├── Data/
│   ├── ContractDefinition.cs   ← ScriptableObject
│   ├── WorkerDefinition.cs     ← ScriptableObject
│   ├── GameEventDefinition.cs  ← ScriptableObject
│   └── UpgradeDefinition.cs    ← ScriptableObject
├── Systems/
│   ├── ProjectSystem.cs     ← project phases, progress, КС-2
│   ├── WorkerSystem.cs      ← hire/fire, binge, leave risk
│   ├── FinanceSystem.cs     ← daily costs, pending payments
│   ├── EventSystem.cs       ← spawn/resolve random events
│   ├── DocumentSystem.cs    ← ИД mini-game
│   └── ProgressionSystem.cs ← unlocks, upgrades, company level
├── UI/
│   ├── UIManager.cs         ← screen switching, popup management
│   ├── HUDController.cs     ← money, stress, reputation, timers
│   ├── HomeScreenUI.cs      ← main screen
│   ├── EventPopupUI.cs      ← event decision popup
│   └── DocumentMiniGameUI.cs ← ИД submission screen
└── Monetization/
    ├── AdsManager.cs        ← rewarded + interstitial wrappers
    └── AnalyticsManager.cs  ← Firebase + GameAnalytics tracking

Assets/ScriptableObjects/   ← create contract/worker/event assets here
Assets/Data/                ← optional JSON data tables
```

## Game Loop (30 ticks = 1 game day)

```
Every tick (1 real second):
  → Workers process (binge, recovery)
  → Finance.ProcessDailyCosts (every 30 ticks)
  → Finance.ProcessPendingPayments (payment timer)
  → Projects.ProcessTick (idle progress, deadline pressure)
  → Events.ProcessTick (spawn/expire events)
  → CheckGameOver (stress >= 100)
```

## Creating Content

### New Contract
1. `Assets → Create → Stroyka → Contract Definition`
2. Fill all fields
3. Add contract ID to `ProgressionSystem.UnlockByProjectCount()` at appropriate level

### New Random Event
1. `Assets → Create → Stroyka → Game Event Definition`
2. Fill event text (use meme Russian tone)
3. Add 2-3 options with real consequence values
4. Set `AutoResolveOptionIndex` to the worst option (player is punished for ignoring)

### New Worker
1. `Assets → Create → Stroyka → Worker Definition`
2. Balance `Efficiency` vs `DailyCost` vs `DrinkRisk`

## Monetization Integration

Replace stubs in `AdsManager.cs` with your ad SDK (AdMob / IronSource MAX):
- Rewarded: `ShowRewarded()` → call `onSuccess` in the reward callback
- Interstitial: `ShowInterstitialIfAvailable()` → call after project completion

Replace stubs in `AnalyticsManager.cs` with Firebase SDK.

## Build

Android: `File → Build Settings → Android → Build`

Required PlayerSettings:
- Minimum API Level: 24
- Target API: 34
- Scripting Backend: IL2CPP
- ARM64 + ARMv7
