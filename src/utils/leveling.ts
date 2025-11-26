import { ImageSourcePropType } from 'react-native';

// --- TYPES ---
export type Reward = {
  level: number;
  title: string;
  image?: ImageSourcePropType; // Placeholder for now
  description: string;
};

// --- CONSTANTS ---
export const MAX_LEVEL = 100;

export const REWARDS: Reward[] = [
  { level: 5, title: 'New Plant Slot', description: 'Unlock a new slot for your garden.' },
  { level: 10, title: 'Sprout Badge', description: 'Show off your progress with a new badge.' },
  { level: 15, title: 'Fertilizer Pack', description: 'Boost your plants growth.' },
  { level: 20, title: 'Gardener Title', description: 'You are now a recognized Gardener.' },
  { level: 30, title: 'Rare Seed', description: 'A mysterious seed for your collection.' },
  { level: 40, title: 'Watering Can Skin', description: 'Style your tools.' },
  { level: 50, title: 'Green Thumb Badge', description: 'Halfway to mastery!' },
  { level: 60, title: 'Greenhouse BG', description: 'A new background for your profile.' },
  { level: 75, title: 'Master Title', description: 'Respect from the community.' },
  { level: 100, title: 'Legendary Trophy', description: 'The ultimate gardening achievement.' },
];

// --- FUNCTIONS ---

/**
 * Calculates the XP required to move from current level to the next.
 * System 2 Formulas:
 * Levels 1–10: XP_next(L) = round(99.9141 * L^1.2)
 * Levels 11–50: XP_next(L) = round(1151.6746 + 5.765454 * L^1.8)
 * Levels 51–99: XP_next(L) = round(4500 + 5.017007 * (L - 51))
 * Level 100: 0
 */
export const xpToNextLevel = (level: number): number => {
  if (level >= MAX_LEVEL) return 0;

  let xp = 0;
  if (level >= 1 && level <= 10) {
    xp = 99.9141 * Math.pow(level, 1.2);
  } else if (level >= 11 && level <= 50) {
    xp = 1151.6746 + 5.765454 * Math.pow(level, 1.8);
  } else if (level >= 51 && level < 100) {
    xp = 4500 + 5.017007 * (level - 51);
  }

  return Math.round(xp);
};

/**
 * Calculates the total cumulative XP required to reach a specific level.
 * This replaces the static XP_TABLE.
 */
export const getTotalXPForLevel = (level: number): number => {
  if (level <= 1) return 0;

  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpToNextLevel(i);
  }
  return total;
};

export const getLevelFromXP = (xp: number): number => {
  // Since we don't have a lookup table, we iterate up to MAX_LEVEL
  // Optimization: We could approximate or use binary search if MAX_LEVEL was huge,
  // but for 100 levels, a simple loop is fast enough.
  for (let i = 1; i < MAX_LEVEL; i++) {
    const xpForNext = getTotalXPForLevel(i + 1);
    if (xp < xpForNext) {
      return i;
    }
  }
  return MAX_LEVEL;
};

export const getXPForNextLevel = (currentLevel: number): number => {
  if (currentLevel >= MAX_LEVEL) return getTotalXPForLevel(MAX_LEVEL);
  return getTotalXPForLevel(currentLevel + 1);
};

export const getLevelProgress = (xp: number, level: number) => {
  if (level >= MAX_LEVEL) return 1;

  const startXP = getTotalXPForLevel(level);
  const nextXP = getTotalXPForLevel(level + 1);

  const needed = nextXP - startXP;
  const current = xp - startXP;

  if (needed <= 0) return 1; // Should not happen for levels < 100

  return Math.min(Math.max(current / needed, 0), 1);
};

export const getNextReward = (level: number): Reward | null => {
  return REWARDS.find(r => r.level > level) || null;
};

export const RANKS = [
  { name: 'Seedling', minLevel: 1, maxLevel: 16 },
  { name: 'Sprout', minLevel: 17, maxLevel: 33 },
  { name: 'Sapling', minLevel: 34, maxLevel: 50 },
  { name: 'Evergreen', minLevel: 51, maxLevel: 67 },
  { name: 'Sunflower', minLevel: 68, maxLevel: 83 },
  { name: 'Roseheart', minLevel: 84, maxLevel: 100 },
];

export const getRankName = (level: number): string => {
  const rank = RANKS.find(r => level >= r.minLevel && level <= r.maxLevel);
  return rank ? rank.name : 'Seedling';
};

