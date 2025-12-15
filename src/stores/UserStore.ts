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
  active_boost_end_time: string | null;
  streak_rescued_date: string | null;
  plants_count: number;
  followers_count: number;
  following_count: number;
};

type InventoryItem = {
  item_id: string;
  quantity: number;
};

type State = {
  user: User | null;
  profile: UserProfile | null;
  inventory: InventoryItem[];
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  addXP: (amount: number) => Promise<void>;
  updateStreak: (newStreak: number, lastDate: string) => void;
  fetchProfile: () => Promise<void>;
  fetchInventory: () => Promise<void>;
  activateBooster: (itemId: string) => Promise<{ success: boolean; message?: string }>;
  checkStreakRescue: () => Promise<void>;
  addPlantCoins: (coins: number) => Promise<void>;
};

export const useUserStore = create<State>((set, get) => ({
  user: null,
  profile: null,
  inventory: [],

  setUser: (user) => {
    set({ user });
    if (user) {
      get().fetchProfile();
      get().fetchInventory();
    } else {
      set({ profile: null, inventory: [] });
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

    const { error: updateError } = await db.user
      .from('Users')
      .update({ plant_coins: newCoins })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating plant coins:', updateError);
      return;
    }
  },

  fetchInventory: async () => {
    const { user } = get();
    if (!user) return;

    try {
      // Use RPC "get_inventory" to bypass complex client-side joins/RLS
      const { data, error } = await db.public.rpc('get_inventory');

      if (error) {
        console.error('[UserStore] Error fetching inventory (RPC):', JSON.stringify(error, null, 2));
        return;
      }

      if (data) {
        console.log('[UserStore] Inventory Loaded (RPC):', data);
        // Data format: [{ item_id: 'name', quantity: X }]
        // Just cast it directly if structure matches
        const inventory = data.map((item: any) => ({
          item_id: (item.item_id || 'unknown').trim(),
          quantity: item.quantity
        }));
        set({ inventory: inventory });
      } else {
        set({ inventory: [] });
      }

    } catch (err) {
      console.error('[UserStore] Exception fetching inventory:', err);
    }
  },

  checkStreakRescue: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await db.public.rpc('rescue_streak_if_needed');
    if (!error && (data as any)?.rescued) {
      console.log('Streak Rescued!', data);
    }
  },

  activateBooster: async (itemId: string) => {
    const { user, fetchProfile, fetchInventory } = get();
    if (!user) return { success: false, message: 'User not logged in' };

    try {
      const { data, error } = await db.public.rpc('use_xp_booster', {
        p_item_name: itemId,
      });

      if (error) throw error;
      const result = data as any;

      if (result.success) {
        await Promise.all([fetchProfile(), fetchInventory()]);
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (e: any) {
      console.error('Error activating booster:', e);
      return { success: false, message: e.message || 'Unknown error' };
    }
  },

  fetchProfile: async () => {
    const { user, checkStreakRescue } = get();
    if (!user) return;

    await checkStreakRescue();

    // 1. Fetch Gamification Stats
    // Using "Player_stats" strictly to match DB casing
    const statsPromise = db.gamification
      .from('Player_stats')
      .select('xp, level, streak_length, last_completed_date, active_boost_end_time, streak_rescued_date')
      .eq('user_id', user.id)
      .single();

    // 2. Fetch Username
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

    // 4. Fetch Title
    const titlePromise = db.gamification
      .from('User_titles')
      .select('selected, Titles (titlename, color)')
      .eq('userid', user.id)
      .eq('selected', true)
      .maybeSingle();

    const [statsResult, userResult, plantsResult, followersResult, followingResult, titleResult] = await Promise.all([
      statsPromise,
      userPromise,
      plantsPromise,
      followersPromise,
      followingPromise,
      titlePromise
    ]);

    // Debug Logs
    if (statsResult.error) console.error('[UserStore] Stats Error:', statsResult.error);
    if (userResult.error) console.error('[UserStore] User Error:', userResult.error);
    if (statsResult.data) console.log('[UserStore] Stats Data Loaded:', statsResult.data);

    const statsData = statsResult.data;
    const statsError = statsResult.error;
    let userData = userResult.data;
    const titleData = titleResult.data;
    const titleInfo = titleData?.Titles as unknown as { titlename: string; color: string } | null;

    let finalProfile: UserProfile = {
      xp: 0,
      level: 1,
      username: userData?.username || user.email?.split('@')[0] || 'Gardener',
      plant_coins: userData?.plant_coins || 0,
      streak_length: 0,
      last_completed_date: null,
      active_boost_end_time: null,
      streak_rescued_date: null,
      title: titleInfo?.titlename || 'Newbie',
      titlecolor: titleInfo?.color || '#2ecc71',
      plants_count: plantsResult.count || 0,
      followers_count: followersResult.count || 0,
      following_count: followingResult.count || 0,
    };

    if (statsData) {
      finalProfile.xp = statsData.xp || 0;
      finalProfile.level = statsData.level || 1;

      // STREAK CALCULATION Logic
      // The DB stores the last known streak. We must check if it's stale.
      const lastDateStr = statsData.last_completed_date;
      const rescuedDateStr = statsData.streak_rescued_date;
      const dbStreak = statsData.streak_length || 0;

      let effectiveStreak = dbStreak;

      if (lastDateStr) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const last = new Date(lastDateStr);
        last.setHours(0, 0, 0, 0);

        const diffTime = today.getTime() - last.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // If gap is > 1 day (meaning missed yesterday), and NOT rescued today
        const isRescuedToday = rescuedDateStr === new Date().toISOString().split('T')[0];

        if (diffDays > 1 && !isRescuedToday) {
          effectiveStreak = 0; // Visual reset
        }
      }

      finalProfile.streak_length = effectiveStreak;
      finalProfile.last_completed_date = lastDateStr || null;
      finalProfile.active_boost_end_time = statsData.active_boost_end_time || null;
      finalProfile.streak_rescued_date = rescuedDateStr || null;
    } else if (statsError && statsError.code === 'PGRST116') {
      // Create if missing
      const { data: newData } = await db.gamification
        .from('Player_stats')
        .insert([{ user_id: user.id, xp: 0, level: 1, streak_length: 0 }])
        .select()
        .single();
      if (newData) {
        finalProfile.xp = newData.xp;
        finalProfile.level = newData.level;
      }
    }

    // Quick retry for user data if needed... (simplified here for brevity, keeping original logic if preferred but this is cleaner)
    // For now assuming userData works or is optional
    set({ profile: finalProfile });
  },

  addXP: async (amount: number) => {
    const { user, profile } = get();
    if (!user || !profile) return;

    const newXP = profile.xp + amount;
    const newLevel = getLevelFromXP(newXP);

    set({ profile: { ...profile, xp: newXP, level: newLevel } });

    const { error } = await db.gamification
      .from('Player_stats')
      .update({ xp: newXP, level: newLevel })
      .eq('user_id', user.id);

    if (error) console.error('Failed to update XP:', error);
  },

  updateStreak: (newStreak: number, lastDate: string) => {
    const { profile } = get();
    if (!profile) return;
    set({ profile: { ...profile, streak_length: newStreak, last_completed_date: lastDate } });
  }
}));
