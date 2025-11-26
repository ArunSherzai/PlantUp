import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { db } from '../utils/supabase';
import { getLevelFromXP } from '../utils/leveling';

type UserProfile = {
  xp: number;
  level: number;
  username: string;
};

type State = {
  user: User | null;
  profile: UserProfile | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  addXP: (amount: number) => Promise<void>;
  fetchProfile: () => Promise<void>;
};

export const useUserStore = create<State>((set, get) => ({
  user: null,
  profile: null,
  setUser: (user) => {
    set({ user });
    if (user) {
      get().fetchProfile();
    } else {
      set({ profile: null });
    }
  },
  setProfile: (profile) => set({ profile }),

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    // 1. Fetch Gamification Stats
    const statsPromise = db.gamification
      .from('player_stats')
      .select('xp, level')
      .eq('user_id', user.id)
      .single();

    // 2. Fetch Username from User Schema
    const userPromise = db.user
      .from('Users')
      .select('username')
      .eq('id', user.id)
      .single();

    const [statsResult, userResult] = await Promise.all([statsPromise, userPromise]);

    console.log('Stats Result:', statsResult);
    console.log('User Result:', userResult);

    const statsData = statsResult.data;
    const statsError = statsResult.error;
    const userData = userResult.data;

    let finalProfile: UserProfile = {
      xp: 0,
      level: 1,
      username: userData?.username || 'Gardener',
    };

    // Handle Stats Logic (Create if missing)
    if (statsData) {
      finalProfile.xp = statsData.xp || 0;
      finalProfile.level = statsData.level || 1;
    } else if (statsError && statsError.code === 'PGRST116') {
      console.log('Profile stats not found, creating new player_stats...');
      const { data: newData } = await db.gamification
        .from('player_stats')
        .insert([{ user_id: user.id, xp: 0, level: 1 }])
        .select()
        .single();

      if (newData) {
        finalProfile.xp = newData.xp;
        finalProfile.level = newData.level;
      }
    }

    set({ profile: finalProfile });
  },

  addXP: async (amount: number) => {
    const { user, profile } = get();
    if (!user || !profile) return;

    const newXP = profile.xp + amount;
    const newLevel = getLevelFromXP(newXP);

    // Optimistic update
    set({ profile: { ...profile, xp: newXP, level: newLevel } });

    // Sync to DB
    const { error } = await db.gamification
      .from('player_stats')
      .update({ xp: newXP, level: newLevel })
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to update XP:', error);
    }
  },
}));
