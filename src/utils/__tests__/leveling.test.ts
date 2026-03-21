// ============================================================
// Test Suite — Gamification Engine (Leveling & XP System)
// ============================================================
// Covers: XP calculations, level progression, rank system,
//         rewards, and edge cases (rapid level-ups, max level).
// ============================================================

import {
  xpToNextLevel,
  getTotalXPForLevel,
  getLevelFromXP,
  getXPForNextLevel,
  getLevelProgress,
  getNextReward,
  getRankName,
  MAX_LEVEL,
  REWARDS,
  RANKS,
} from '../leveling';

// ============================================================
// 1. xpToNextLevel — XP required per level
// ============================================================

describe('xpToNextLevel', () => {
  it('should return > 0 for levels 1-99', () => {
    // Arrange & Act & Assert
    for (let level = 1; level < MAX_LEVEL; level++) {
      expect(xpToNextLevel(level)).toBeGreaterThan(0);
    }
  });

  it('should return 0 for MAX_LEVEL (100)', () => {
    // Arrange & Act
    const result = xpToNextLevel(MAX_LEVEL);

    // Assert
    expect(result).toBe(0);
  });

  it('should return 0 for levels above MAX_LEVEL', () => {
    // Arrange & Act
    const result = xpToNextLevel(150);

    // Assert
    expect(result).toBe(0);
  });

  it('should use L^1.2 formula for levels 1-10', () => {
    // Arrange
    const level = 5;

    // Act
    const result = xpToNextLevel(level);

    // Assert — 99.9141 * 5^1.2 ≈ 672
    const expected = Math.round(99.9141 * Math.pow(5, 1.2));
    expect(result).toBe(expected);
  });

  it('should use compound formula for levels 11-50', () => {
    // Arrange
    const level = 25;

    // Act
    const result = xpToNextLevel(level);

    // Assert
    const expected = Math.round(1151.6746 + 5.765454 * Math.pow(25, 1.8));
    expect(result).toBe(expected);
  });

  it('should use linear formula for levels 51-99', () => {
    // Arrange
    const level = 75;

    // Act
    const result = xpToNextLevel(level);

    // Assert
    const expected = Math.round(4500 + 5.017007 * (75 - 51));
    expect(result).toBe(expected);
  });

  it('should produce increasing XP requirements within the 1-10 range', () => {
    // Arrange & Act
    const xps = Array.from({ length: 10 }, (_, i) => xpToNextLevel(i + 1));

    // Assert — should be monotonically increasing
    for (let i = 1; i < xps.length; i++) {
      expect(xps[i]).toBeGreaterThanOrEqual(xps[i - 1]);
    }
  });
});

// ============================================================
// 2. getTotalXPForLevel — Cumulative XP
// ============================================================

describe('getTotalXPForLevel', () => {
  it('should return 0 for level 1', () => {
    // Arrange & Act
    const result = getTotalXPForLevel(1);

    // Assert
    expect(result).toBe(0);
  });

  it('should return 0 for level 0 and below', () => {
    // Arrange & Act & Assert
    expect(getTotalXPForLevel(0)).toBe(0);
    expect(getTotalXPForLevel(-5)).toBe(0);
  });

  it('should return xpToNextLevel(1) for level 2', () => {
    // Arrange & Act
    const result = getTotalXPForLevel(2);

    // Assert
    expect(result).toBe(xpToNextLevel(1));
  });

  it('should return monotonically increasing cumulative XP', () => {
    // Arrange & Act
    let prev = 0;
    for (let level = 2; level <= MAX_LEVEL; level++) {
      const total = getTotalXPForLevel(level);

      // Assert
      expect(total).toBeGreaterThan(prev);
      prev = total;
    }
  });
});

// ============================================================
// 3. getLevelFromXP — Reverse lookup
// ============================================================

describe('getLevelFromXP', () => {
  it('should return level 1 for 0 XP', () => {
    // Arrange & Act
    const result = getLevelFromXP(0);

    // Assert
    expect(result).toBe(1);
  });

  it('should return MAX_LEVEL for absurdly high XP', () => {
    // Arrange & Act
    const result = getLevelFromXP(999_999_999);

    // Assert
    expect(result).toBe(MAX_LEVEL);
  });

  it('should return correct level for boundary XP (exact level-up point)', () => {
    // Arrange — XP exactly at level 10 threshold
    const xpForLevel10 = getTotalXPForLevel(10);

    // Act
    const result = getLevelFromXP(xpForLevel10);

    // Assert
    expect(result).toBe(10);
  });

  it('should return previous level when XP is just below next threshold', () => {
    // Arrange
    const xpForLevel10 = getTotalXPForLevel(10);

    // Act
    const result = getLevelFromXP(xpForLevel10 - 1);

    // Assert
    expect(result).toBe(9);
  });

  it('should handle rapid state transitions (quick level-ups)', () => {
    // Arrange — simulate rapid XP gain from level 1 to 50
    const xpAtLevel50 = getTotalXPForLevel(50);

    // Act
    const level = getLevelFromXP(xpAtLevel50);

    // Assert
    expect(level).toBe(50);
  });

  it('should always return a value between 1 and MAX_LEVEL', () => {
    // Arrange & Act & Assert
    const testXPs = [0, 100, 1000, 50000, 500000, 9999999];
    testXPs.forEach(xp => {
      const level = getLevelFromXP(xp);
      expect(level).toBeGreaterThanOrEqual(1);
      expect(level).toBeLessThanOrEqual(MAX_LEVEL);
    });
  });
});

// ============================================================
// 4. getLevelProgress — Progress within a level (0..1)
// ============================================================

describe('getLevelProgress', () => {
  it('should return 0 at the start of a level', () => {
    // Arrange
    const level = 5;
    const xp = getTotalXPForLevel(level);

    // Act
    const progress = getLevelProgress(xp, level);

    // Assert
    expect(progress).toBe(0);
  });

  it('should return ~0.5 at the midpoint of a level', () => {
    // Arrange
    const level = 5;
    const startXP = getTotalXPForLevel(level);
    const nextXP = getTotalXPForLevel(level + 1);
    const midXP = startXP + (nextXP - startXP) / 2;

    // Act
    const progress = getLevelProgress(midXP, level);

    // Assert
    expect(progress).toBeCloseTo(0.5, 1);
  });

  it('should return 1 for MAX_LEVEL', () => {
    // Arrange & Act
    const progress = getLevelProgress(999999, MAX_LEVEL);

    // Assert
    expect(progress).toBe(1);
  });

  it('should clamp between 0 and 1', () => {
    // Arrange
    const level = 5;

    // Act — XP below level start
    const progressLow = getLevelProgress(0, level);
    // Act — XP way above level
    const progressHigh = getLevelProgress(999999, level);

    // Assert
    expect(progressLow).toBeGreaterThanOrEqual(0);
    expect(progressHigh).toBeLessThanOrEqual(1);
  });
});

// ============================================================
// 5. Rank System
// ============================================================

describe('getRankName', () => {
  it('should return "Seedling" for level 1', () => {
    // Arrange & Act
    const rank = getRankName(1);

    // Assert
    expect(rank).toBe('Seedling');
  });

  it('should return "Roseheart" for level 100', () => {
    // Arrange & Act
    const rank = getRankName(100);

    // Assert
    expect(rank).toBe('Roseheart');
  });

  it('should return correct rank at each boundary', () => {
    // Arrange & Act & Assert
    expect(getRankName(16)).toBe('Seedling');
    expect(getRankName(17)).toBe('Sprout');
    expect(getRankName(33)).toBe('Sprout');
    expect(getRankName(34)).toBe('Sapling');
    expect(getRankName(50)).toBe('Sapling');
    expect(getRankName(51)).toBe('Evergreen');
    expect(getRankName(67)).toBe('Evergreen');
    expect(getRankName(68)).toBe('Sunflower');
    expect(getRankName(83)).toBe('Sunflower');
    expect(getRankName(84)).toBe('Roseheart');
  });

  it('should fallback to "Seedling" for level 0 or negative', () => {
    // Arrange & Act & Assert
    expect(getRankName(0)).toBe('Seedling');
    expect(getRankName(-5)).toBe('Seedling');
  });

  it('should have contiguous, non-overlapping rank ranges', () => {
    // Assert — verify no gaps or overlaps
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].minLevel).toBe(RANKS[i - 1].maxLevel + 1);
    }
    expect(RANKS[0].minLevel).toBe(1);
    expect(RANKS[RANKS.length - 1].maxLevel).toBe(100);
  });
});

// ============================================================
// 6. Rewards System
// ============================================================

describe('getNextReward', () => {
  it('should return level 5 reward for level 1 user', () => {
    // Arrange & Act
    const reward = getNextReward(1);

    // Assert
    expect(reward).not.toBeNull();
    expect(reward!.level).toBe(5);
  });

  it('should return level 50 reward for level 40 user', () => {
    // Arrange & Act
    const reward = getNextReward(40);

    // Assert
    expect(reward).not.toBeNull();
    expect(reward!.level).toBe(50);
  });

  it('should return null for MAX_LEVEL user (no more rewards)', () => {
    // Arrange & Act
    const reward = getNextReward(100);

    // Assert
    expect(reward).toBeNull();
  });

  it('should return null when user is past all reward levels', () => {
    // Arrange & Act
    const reward = getNextReward(101);

    // Assert
    expect(reward).toBeNull();
  });

  it('should have rewards in ascending level order', () => {
    // Assert
    for (let i = 1; i < REWARDS.length; i++) {
      expect(REWARDS[i].level).toBeGreaterThan(REWARDS[i - 1].level);
    }
  });
});
