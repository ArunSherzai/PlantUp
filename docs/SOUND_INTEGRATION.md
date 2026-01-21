# PlantUp Sound Integration Guide

This document lists all app actions that should trigger sound effects, mapped to the sounds defined in `SoundManager.ts`.

---

## ✅ Integrated Sounds

### UI Interactions
| Sound | Location | Action |
|-------|----------|--------|
| `click` | `Button.tsx`, `GradientButton.tsx` | All button presses (built-in) |
| `click` | `SettingsScreen.tsx` | Toggle sound on confirmation |
| `confirm` | `LootboxScreen.tsx` | Confirming reward claim |
| `confirm` | `createPostScreen.tsx` | Post created successfully |
| `reload` | `FeedScreen.tsx` | Pull-to-refresh feed |
| `reload` | `showMissionsScreen.tsx` | Refresh missions |
| `reload` | `BorderInventoryScreen.tsx` | Pull-to-refresh borders |
| `reload` | `TitleInventoryScreen.tsx` | Pull-to-refresh titles |
| `reload` | `DirectMessagesScreen.tsx` | Pull-to-refresh messages |

### Messaging
| Sound | Location | Action |
|-------|----------|--------|
| `send` | `MessageDetailScreen.tsx` | Sending a DM |
| `sprig_noti` | `TipNotification.tsx` | Tip notifications |

### XP & Progression
| Sound | Location | Action |
|-------|----------|--------|
| `xp_boost` | `BoosterWidget.tsx` | Activating a booster |
| `xp_fill` | `XPOverlay.tsx` | XP bar animation |

### Streaks & Freeze
| Sound | Location | Action |
|-------|----------|--------|
| `freeze_activate` | `StreakSavedOverlay.tsx` | Streak freeze used |

### Lootbox
| Sound | Location | Action |
|-------|----------|--------|
| `lootbox_open` | `LootboxScreen.tsx` | Opening lootbox |
| `lootbox_reward` | `LootboxScreen.tsx` | Reward reveal |

---

## ❌ Not Yet Integrated (Lower Priority)

| Sound | Suggested Action | Notes |
|-------|-----------------|-------|
| `receive` | Real-time DM received | Requires DMStore real-time handler |
| `xp_multiplier` | Activating XP multiplier | If/when multipliers are implemented |
| `xp_lost` | Losing XP / streak broken | Needs streak loss handler |
| `streak_activate` | Streak milestone reached | Needs streak milestone detection |
| `freeze_used` | Freeze consumed (day missed) | Already using `freeze_activate` |

---

## Usage Example

```typescript
import { playSound } from '~/utils/SoundManager';

// Play a click sound
playSound('click');

// Play with custom volume
playSound('lootbox_reward', { volume: 0.8 });
```

---

## Notes

- Sounds respect the global "Sound Effects" toggle in Settings
- Sounds are automatically muted when the app is in the background
- The `click` sound has a 100ms debounce to prevent spam
- Core sounds (`click`, `confirm`, `reload`) are preloaded at startup for instant playback
- `Button.tsx` and `GradientButton.tsx` have built-in click sounds (default enabled)
