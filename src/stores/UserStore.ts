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
  plants_count: number;
  followers_count: number;
  following_count: number;
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
      .select('username, plant_coins')
      .eq('id', user.id)
      .single();

    // 3. Fetch Counts
    const plantsPromise = db.social
      .from('Plants')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const followersPromise = db.social
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id);

    const followingPromise = db.social
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id);

    // 4. Fetch Title (Selected)
    const titlePromise = db.gamification
      .from('User_titles')
      // Implicit join with Titles table using foreign key
      .select('selected, Titles (titlename, color)')
      .eq('userid', user.id)
      .eq('selected', true)
      .maybeSingle(); // Use maybeSingle to avoid error if no title selected

    const [statsResult, userResult, plantsResult, followersResult, followingResult, titleResult] = await Promise.all([
      statsPromise,
      userPromise,
      plantsPromise,
      followersPromise,
      followingPromise,
      titlePromise
    ]);

    console.log('Stats Result:', statsResult);
    console.log('User Result:', userResult);
    console.log('Title Result:', titleResult);

    const statsData = statsResult.data;
    const statsError = statsResult.error;
    let userData = userResult.data;
    const titleData = titleResult.data;

    // Helper to extract title info safely
    const titleInfo = titleData?.Titles as unknown as { titlename: string; color: string } | null;

    let finalProfile: UserProfile = {
      xp: 0,
      level: 1,
      username: userData?.username || user.email?.split('@')[0] || 'Gardener',
      plant_coins: userData?.plant_coins || 0,
      streak_length: 0,
      last_completed_date: null,
      title: titleInfo?.titlename || 'Newbie',
      titlecolor: titleInfo?.color || '#2ecc71',
      plants_count: plantsResult.count || 0,
      followers_count: followersResult.count || 0,
      following_count: followingResult.count || 0,
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

    // Retry fetching user data (Supabase trigger might verify creation)
    let retries = 5;
    while (!userData && retries > 0) {
      console.log(`User record not found, retrying in 1s... (${retries} attempts left)`);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const retryResult = await db.user
        .from('Users')
        .select('username, plant_coins')
        .eq('id', user.id)
        .single();

      userData = retryResult.data;
      if (retryResult.error && retryResult.error.code !== 'PGRST116') {
        console.error('Error retrying user fetch:', retryResult.error);
      }
      retries--;
    }

    if (!userData) {
      console.warn('User record still not found after retries.');
    }

    // Check if title was fetched in retry or initially? 
    // Title is fetched separate from User retry loop above, so we rely on titleResult
    // which was fetched in parallel. If user didn't exist, title likely didn't either.
    // If needed, we could retry title fetch here too, but for now we rely on defaults.

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
