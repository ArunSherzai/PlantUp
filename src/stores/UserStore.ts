import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { db } from '../utils/supabase';
import { getLevelFromXP } from '../utils/leveling';

type UserProfile = {
  xp: number;
  level: number;
  username: string;
  plant_coins: number;
  profile_image?: string;
  streak_length: number;
  last_completed_date: string | null;
  title?: string;
  titlecolor?: string;
};

type State = {
  user: User | null;
  profile: UserProfile | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  addXP: (amount: number) => Promise<void>;
  updateStreak: (newStreak: number, lastDate: string) => void;
  fetchProfile: () => Promise<void>;
  addPlantCoins: (coins: number) => Promise<void>;
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

  addPlantCoins: async (coins: number) => {
    const { user } = get();
    if (!user) return;

    const { data: userData, error: selectError } = await db.user
      .from('Users')
      .select('username, plant_coins')
      .eq('id', user.id)
      .single();

    if (selectError) {
      console.error('Error loading user for coin update:', selectError);
      return;
    }

    const currentCoins = userData?.plant_coins ?? 0;
    const newCoins = currentCoins + coins;

    // 2) Update plant_coins with the new value
    const { data: updatedUser, error: updateError } = await db.user
      .from('Users')
      .update({ plant_coins: newCoins })
      .eq('id', user.id)
      .select('username, plant_coins')
      .single();

    if (updateError) {
      console.error('Error updating plant coins:', updateError);
      return;
    }

    console.log('Updated user coins:', updatedUser);
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    // 1. Fetch Gamification Stats
    const statsPromise = db.gamification
      .from('player_stats')
      .select('xp, level, streak_length, last_completed_date')
      .eq('user_id', user.id)
      .single();

    // 2. Fetch Username from User Schema
    const userPromise = db.user
      .from('Users')
      .select('username, plant_coins, title, title_color')
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
      plant_coins: userData?.plant_coins || 0,
      streak_length: 0,
      last_completed_date: null,
      title: userData?.title || 'Newbie',
      titlecolor: userData?.title_color || '#2ecc71',
    };

    console.log(finalProfile);
    // Handle Stats Logic (Create if missing)
    if (statsData) {
      finalProfile.xp = statsData.xp || 0;
      finalProfile.level = statsData.level || 1;
      finalProfile.streak_length = statsData.streak_length || 0;
      finalProfile.last_completed_date = statsData.last_completed_date || null;
    } else if (statsError && statsError.code === 'PGRST116') {
      console.log('Profile stats not found, creating new player_stats...');
      const { data: newData } = await db.gamification
        .from('player_stats')
        .insert([{ user_id: user.id, xp: 0, level: 1, streak_length: 0 }])
        .select()
        .single();

      if (newData) {
        finalProfile.xp = newData.xp;
        finalProfile.level = newData.level;
        finalProfile.streak_length = newData.streak_length;
        finalProfile.last_completed_date = newData.last_completed_date;
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

    // Sync to DB (Only xp/level update here, streak is handled via RPC usually)
    const { error } = await db.gamification
      .from('player_stats')
      .update({ xp: newXP, level: newLevel })
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to update XP:', error);
    }
  },

  updateStreak: (newStreak: number, lastDate: string) => {
    const { profile } = get();
    if (!profile) return;
    set({ profile: { ...profile, streak_length: newStreak, last_completed_date: lastDate } });
  }
}));
