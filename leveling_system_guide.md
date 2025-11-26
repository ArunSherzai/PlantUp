# Leveling System Guide

This guide explains how the XP leveling system works in **PlantUp** and how to use it in the codebase.

## 1. How It Works

The system uses a mathematical progression ("System 2") to determine levels based on total XP. It is **not** based on a static table of values, but rather calculated dynamically.

### The Formulas
The XP required to reach the *next* level is calculated as follows:

- **Levels 1–10**: `round(99.9141 * Level^1.2)`
- **Levels 11–50**: `round(1151.6746 + 5.765454 * Level^1.8)`
- **Levels 51–99**: `round(4500 + 5.017007 * (Level - 51))`
- **Level 100**: Max Level (0 XP needed)

### Data Persistence
User progress is stored in Supabase:
- **Table**: `gamification.player_stats`
- **Columns**: `user_id`, `xp`, `level`
- **Sync**: The `UserStore` automatically syncs local changes to this table.

---

## 2. Using the System in Code

### Adding XP
To award XP to a user (e.g., after completing a mission), use the `UserStore`. This handles the math, level-up checks, and database syncing automatically.

```typescript
import { useUserStore } from '../stores/UserStore';

// Inside a component or function
const addXP = useUserStore((state) => state.addXP);

const handleMissionComplete = () => {
  addXP(500); // Adds 500 XP and recalculates level
};
```

### Reading User Progress
Access the user's current profile data from the store.

```typescript
const profile = useUserStore((state) => state.profile);

if (profile) {
  console.log(`Current Level: ${profile.level}`);
  console.log(`Total XP: ${profile.xp}`);
}
```

### Helper Functions (`src/utils/leveling.ts`)
Use these pure functions for UI calculations or logic that doesn't need the store.

- **`xpToNextLevel(level)`**: Returns XP needed to go from `level` -> `level + 1`.
- **`getTotalXPForLevel(level)`**: Returns the *cumulative* XP required to reach a specific level from 0.
- **`getLevelProgress(xp, level)`**: Returns a 0-1 decimal for progress bars.
- **`getLevelFromXP(xp)`**: Calculates the level for a given total XP amount.

---

## 3. UI Components

### RankCard
The `RankCard` component automatically visualizes the user's progress.

```tsx
import RankCard from '../components/RankCard';
import { useUserStore } from '../stores/UserStore';

export default function MyScreen() {
  const profile = useUserStore((state) => state.profile);

  if (!profile) return null;

  return (
    <RankCard 
      level={profile.level} 
      xp={profile.xp} 
    />
  );
}
```
