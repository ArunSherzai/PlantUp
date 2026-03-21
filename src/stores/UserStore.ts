import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { db } from '../utils/supabase';
import { BlockService } from '../features/blocking/BlockService';
import { getLevelFromXP } from '../utils/leveling';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ErrorHandlerService } from '../core/error/services/ErrorHandlerService';
import { getTodayQuestKey, trackQuestAction } from '../features/quests/questProgress';
import { DEFAULT_NOTIFICATION_SOUND_SETTINGS, type NotificationSoundCategory, type NotificationSoundPreference } from '../features/notifications/config/notificationSoundConfig';

type Border = {
  id: string;
  name: string;
  rarity: string;
  media_url: string;
  unlock_type: string;
  unlock_value: number;
  is_equipped?: boolean;
};

type UserProfile = {
  xp: number;
  level: number;
  username: string;
  plant_coins: number;
  bio?: string;
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
  equipped_border?: Border | null;
  tutorial_progress: Record<string, boolean>;
};

type InventoryItem = {
  item_id: string;
  quantity: number;
};

type Title = {
  id: string;
  name: string;
  color: string;
  is_equipped: boolean;
};

export type LevelReward = {
  level: number;
  reward_type: 'COINS' | 'ITEM' | 'TITLE' | 'BORDER' | 'XP_BOOST';
  reference_id: string | null;
  quantity: number;
  title: string;
  description: string;
  status: 'LOCKED' | 'AVAILABLE' | 'CLAIMED';
  media_url: string | null;
};

type State = {
  user: User | null;
  profile: UserProfile | null;
  inventory: InventoryItem[];
  ownedBorders: Border[];
  ownedTitles: Title[];
  unclaimedRewards: any[]; // Deprecated, use rewardsMap
  rewardsMap: LevelReward[];
  isFetchingProfile: boolean;
  lastStreakCheckDate: string | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  addXP: (amount: number) => Promise<void>;
  updateStreak: (newStreak: number, lastDate: string) => void;
  fetchProfile: () => Promise<void>;
  fetchDeepProfile: () => Promise<void>;
  fetchInventory: () => Promise<void>;
  activateBooster: (itemId: string) => Promise<{ success: boolean; message?: string }>;
  checkStreakRescue: () => Promise<void>;
  addPlantCoins: (coins: number) => Promise<void>;
  fetchBorders: () => Promise<void>;
  equipBorder: (borderId: string | null) => Promise<void>;
  fetchTitles: () => Promise<void>;
  equipTitle: (titleId: string | null) => Promise<void>;
  fetchUnclaimedRewards: () => Promise<void>;
  claimReward: (level: number) => Promise<boolean>;
  sprigNotificationsEnabled: boolean;
  notificationSoundSettings: Record<NotificationSoundCategory, NotificationSoundPreference>;
  loadSettings: () => Promise<void>;
  toggleSprigNotifications: (enabled: boolean) => Promise<void>;
  updateNotificationSound: (category: NotificationSoundCategory, sound: NotificationSoundPreference) => Promise<void>;
  buyShopItem: (itemId: string, price: number) => Promise<{ success: boolean; message: string }>;
  buyLootbox: (price: number) => Promise<{ success: boolean; message: string; rewardType?: string; rewardValue?: string }>;
  fetchRewardsMap: () => Promise<void>;

  // Blocking
  blockedUserIds: Set<string>;
  fetchBlockedUsers: () => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  isBlocked: (userId: string) => boolean;

  // Tutorials
  markTutorialComplete: (tutorialId: string) => Promise<void>;
  resetTutorialProgress: (tutorialId: string) => Promise<void>;
};

export const useUserStore = create<State>((set, get) => ({
  user: null,
  profile: null,
  inventory: [],
  ownedBorders: [],
  ownedTitles: [],
  unclaimedRewards: [],
  rewardsMap: [],
  isFetchingProfile: false,
  lastStreakCheckDate: null,
  sprigNotificationsEnabled: true,
  notificationSoundSettings: DEFAULT_NOTIFICATION_SOUND_SETTINGS,

  loadSettings: async () => {
    try {
      const [enabledValue, soundValue] = await Promise.all([
        AsyncStorage.getItem('sprigNotificationsEnabled'),
        AsyncStorage.getItem('notificationSoundSettings'),
      ]);

      const nextState: Partial<State> = {};

      if (enabledValue !== null) {
        nextState.sprigNotificationsEnabled = JSON.parse(enabledValue);
      }

      if (soundValue !== null) {
        nextState.notificationSoundSettings = {
          ...DEFAULT_NOTIFICATION_SOUND_SETTINGS,
          ...JSON.parse(soundValue),
        };
      }

      if (Object.keys(nextState).length > 0) {
        set(nextState as Partial<State>);
      }
    } catch (e) {
      ErrorHandlerService.handle(e, { showUI: false });
    }
  },

  toggleSprigNotifications: async (enabled: boolean) => {
    set({ sprigNotificationsEnabled: enabled });
    try {
      await AsyncStorage.setItem('sprigNotificationsEnabled', JSON.stringify(enabled));
    } catch (e) {
      ErrorHandlerService.handle(e, { showUI: false });
    }
  },

  updateNotificationSound: async (category: NotificationSoundCategory, sound: NotificationSoundPreference) => {
    const nextSettings = {
      ...get().notificationSoundSettings,
      [category]: sound,
    };

    set({ notificationSoundSettings: nextSettings });

    try {
      await AsyncStorage.setItem('notificationSoundSettings', JSON.stringify(nextSettings));
    } catch (e) {
      ErrorHandlerService.handle(e, { showUI: false });
    }
  },

  setUser: (user) => {
    set({ user });
    if (user) {
      trackQuestAction({
        actionCode: 'WEEKLY_LOGIN_STREAK',
        eventKey: getTodayQuestKey(),
      });

      // 1. Prioritize essential profile data for immediate UI interaction
      get().fetchProfile();

      // 2. Stagger other non-critical data
      setTimeout(() => {
        get().fetchInventory();
        get().fetchBlockedUsers();
        get().loadSettings();
      }, 800);

      setTimeout(() => {
        // Fetch full profile details (counts, titles, etc.)
        get().fetchDeepProfile();
      }, 1500);

      setTimeout(() => {
        get().fetchRewardsMap();
      }, 2500);

      // Subscribe to DM inbox 
      setTimeout(() => {
        const { subscribeToInbox, fetchConversations } = require('./DMStore').useDMStore.getState();
        fetchConversations();
        subscribeToInbox();
      }, 1000); // Reduced delay
    }
    else {
      set({ profile: null, inventory: [], ownedBorders: [], ownedTitles: [] });

      // Unsubscribe from inbox on logout
      const { unsubscribeFromInbox } = require('./DMStore').useDMStore.getState();
      unsubscribeFromInbox?.();
    }
  },
  setProfile: (profile) => set({ profile }),

  markTutorialComplete: async (tutorialId: string) => {
    const { user, profile } = get();
    if (!user || !profile) return;

    const currentProgress = profile.tutorial_progress || {};
    if (currentProgress[tutorialId]) return; // Already completed

    const newProgress = { ...currentProgress, [tutorialId]: true };

    // Optimistic UI update
    set({ profile: { ...profile, tutorial_progress: newProgress } });

    // Database update
    const { error } = await db.user
      .from('Users')
      .update({ tutorial_progress: newProgress })
      .eq('id', user.id);

    if (error) {
      ErrorHandlerService.handle(error, { showUI: false });
      // Revert optimism on failure
      set({ profile: { ...profile, tutorial_progress: currentProgress } });
    }
  },

  resetTutorialProgress: async (tutorialId: string) => {
    const { user, profile } = get();
    if (!user || !profile) return;

    const currentProgress = profile.tutorial_progress || {};
    if (currentProgress[tutorialId] === false) return; // Already reset

    const newProgress = { ...currentProgress, [tutorialId]: false };

    // Optimistic UI update
    set({ profile: { ...profile, tutorial_progress: newProgress } });

    // Database update
    const { error } = await db.user
      .from('Users')
      .update({ tutorial_progress: newProgress })
      .eq('id', user.id);

    if (error) {
      ErrorHandlerService.handle(error, { showUI: false });
      // Revert optimism on failure
      set({ profile: { ...profile, tutorial_progress: currentProgress } });
    }
  },

  addPlantCoins: async (coins: number) => {
    const { user } = get();
    if (!user) return;

    const { data: userData, error: selectError } = await db.user
      .from('Users')
      .select('username, plant_coins')
      .eq('id', user.id)
      .single();

    if (selectError) {
      ErrorHandlerService.handle(selectError, { showUI: false });
      return;
    }

    const currentCoins = userData?.plant_coins ?? 0;
    const newCoins = currentCoins + coins;

    const { error: updateError } = await db.user
      .from('Users')
      .update({ plant_coins: newCoins })
      .eq('id', user.id);

    if (updateError) {
      ErrorHandlerService.handle(updateError, { showUI: false });
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
        ErrorHandlerService.handle(error, { showUI: false });
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
      ErrorHandlerService.handle(err, { showUI: false });
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
      const handled = ErrorHandlerService.handle(e, { showUI: false });
      return { success: false, message: handled.userMessage || 'Unknown error' };
    }
  },

  fetchProfile: async () => {
    const { user, checkStreakRescue, isFetchingProfile, lastStreakCheckDate } = get();
    if (!user || isFetchingProfile) return;

    set({ isFetchingProfile: true });

    // 0. Only check streak rescue once per day/session
    const today = new Date().toISOString().split('T')[0];
    if (lastStreakCheckDate !== today) {
      await checkStreakRescue();
      set({ lastStreakCheckDate: today });
    }

    // 1. Fetch Gamification Stats
    // Using "Player_stats" strictly to match DB casing
    const statsPromise = db.gamification
      .from('Player_stats')
      .select('xp, level, streak_length, last_completed_date, active_boost_end_time, streak_rescued_date')
      .eq('user_id', user.id)
      .maybeSingle();

    // 2. Fetch Username & Tutorials
    const userPromise = db.user
      .from('Users')
      .select('username, plant_coins, avatar_path, bio, tutorial_progress')
      .eq('id', user.id)
      .single();

    const [statsResult, userResult] = await Promise.all([
      statsPromise,
      userPromise
    ]);

    // Debug Logs
    if (statsResult.error) ErrorHandlerService.handle(statsResult.error, { showUI: false });
    if (userResult.error) ErrorHandlerService.handle(userResult.error, { showUI: false });

    const statsData = statsResult.data;
    const userData = userResult.data;

    // Process Avatar Path
    let profileImageUrl = undefined;
    if (userData?.avatar_path) {
      // If it's a full URL, use it; otherwise resolve from storage
      if (userData.avatar_path.startsWith('http')) {
        profileImageUrl = userData.avatar_path;
      } else {
        const { data } = db.public.storage.from('avatar').getPublicUrl(userData.avatar_path);
        profileImageUrl = data.publicUrl;
      }
    }

    const { profile: currentProfile } = get();

    let finalProfile: UserProfile = {
      xp: statsData?.xp || 0,
      level: statsData?.level || 1,
      username: userData?.username || user.email?.split('@')[0] || 'Gardener',
      plant_coins: userData?.plant_coins || 0,
      bio: userData?.bio || '',
      profile_image: profileImageUrl,
      streak_length: currentProfile?.streak_length || 0,
      last_completed_date: currentProfile?.last_completed_date || null,
      active_boost_end_time: currentProfile?.active_boost_end_time || null,
      streak_rescued_date: currentProfile?.streak_rescued_date || null,
      plants_count: currentProfile?.plants_count || 0,
      followers_count: currentProfile?.followers_count || 0,
      following_count: currentProfile?.following_count || 0,
      equipped_border: currentProfile?.equipped_border,
      title: currentProfile?.title,
      titlecolor: currentProfile?.titlecolor,
      tutorial_progress: userData?.tutorial_progress || {},
    };

    if (statsData) {
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
      } else if (dbStreak > 0) {
        // If no date is recorded but streak exists, it's invalid/stale -> Reset
        effectiveStreak = 0;
      }

      finalProfile.streak_length = effectiveStreak;
      finalProfile.last_completed_date = lastDateStr || null;
      finalProfile.active_boost_end_time = statsData.active_boost_end_time || null;
      finalProfile.streak_rescued_date = rescuedDateStr || null;
    } else if (!statsData) {
      // Create if missing (PGRST116 or null from maybeSingle)
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

    set({ profile: finalProfile, isFetchingProfile: false });
  },

  fetchDeepProfile: async () => {
    const { user, profile } = get();
    if (!user || !profile) return;

    // 1. Fetch Counts & Titles in parallel
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

    const titlePromise = db.gamification
      .from('User_titles')
      .select('selected, Titles (titlename, color)')
      .eq('userid', user.id)
      .eq('selected', true)
      .maybeSingle();

    // 5. Fetch Equipped Border
    const borderPromise = db.gamification
      .from('User_owned_border')
      .select('is_equipped, Cosmetic_avatar_borders (*)')
      .eq('user_id', user.id)
      .eq('is_equipped', true)
      .maybeSingle();

    const [plantsResult, followersResult, followingResult, titleResult, borderResult] = await Promise.all([
      plantsPromise,
      followersPromise,
      followingPromise,
      titlePromise,
      borderPromise
    ]);

    const titleData = titleResult.data;
    const titleInfo = titleData?.Titles as unknown as { titlename: string; color: string } | null;
    // Process Border
    let equippedBorderData = borderResult.data?.Cosmetic_avatar_borders as unknown as Border | null;

    if (equippedBorderData && (equippedBorderData as any).media_url) {
      // Fix for seasonal folders: replace specific seasons with generic 'seasonal' folder
      let mediaPath = (equippedBorderData as any).media_url;
      if (mediaPath.includes('seasonal_summer') || mediaPath.includes('seasonal_winter')) {
        mediaPath = mediaPath.replace('seasonal_summer', 'seasonal').replace('seasonal_winter', 'seasonal');
      }

      const { data } = db.public.storage
        .from('border-skins')
        .getPublicUrl(mediaPath);

      if (data?.publicUrl) {
        equippedBorderData = { ...equippedBorderData, media_url: data.publicUrl };
      }
    }

    set({
      profile: {
        ...profile,
        plants_count: plantsResult.count || 0,
        followers_count: followersResult.count || 0,
        following_count: followingResult.count || 0,
        title: titleInfo?.titlename,
        titlecolor: titleInfo?.color,
        equipped_border: equippedBorderData,
      }
    });
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

    if (error) ErrorHandlerService.handle(error, { showUI: false });
  },

  updateStreak: (newStreak: number, lastDate: string) => {
    const { profile } = get();
    if (!profile) return;
    set({ profile: { ...profile, streak_length: newStreak, last_completed_date: lastDate } });
  },

  fetchBorders: async () => {
    const { user } = get();
    if (!user) return;

    try {


      // Step 1: Get owned border IDs and equipped status
      const { data: ownedData, error: ownedError } = await db.gamification
        .from('User_owned_border')
        .select('border_id, is_equipped')
        .eq('user_id', user.id);

      if (ownedError) {
        ErrorHandlerService.handle(ownedError, { showUI: false });
        return;
      }

      if (!ownedData || ownedData.length === 0) {

        set({ ownedBorders: [] });
        return;
      }

      const borderIds = ownedData.map((item: any) => item.border_id);


      // Step 2: Fetch details for these IDs
      const { data: bordersData, error: bordersError } = await db.gamification
        .from('Cosmetic_avatar_borders')
        .select('*')
        .in('id', borderIds);

      if (bordersError) {
        ErrorHandlerService.handle(bordersError, { showUI: false });
        return;
      }
      if (!bordersData) {
        set({ ownedBorders: [] });
        return;
      }
      // Step 3: Merge data
      const mergedBorders: Border[] = await Promise.all(bordersData.map(async (border: any) => {
        // Find ownership info
        const ownership = ownedData.find((o: any) => o.border_id === border.id);
        let mediaUrl = border.media_url;
        if (border.media_url) {
          // Fix for seasonal folders: replace specific seasons with generic 'seasonal' folder
          let mediaPath = border.media_url;
          if (mediaPath.includes('seasonal_summer') || mediaPath.includes('seasonal_winter')) {
            mediaPath = mediaPath.replace('seasonal_summer', 'seasonal').replace('seasonal_winter', 'seasonal');
          }

          const { data } = db.public.storage
            .from('border-skins').getPublicUrl(mediaPath);
          if (data?.publicUrl) {
            mediaUrl = data.publicUrl;
          }
        }

        return {
          ...border,
          media_url: mediaUrl,
          is_equipped: ownership ? ownership.is_equipped : false
        };
      }));


      set({ ownedBorders: mergedBorders });

    } catch (error) {
      ErrorHandlerService.handle(error, { showUI: false });
    }
  },

  equipBorder: async (borderId: string | null) => {
    const { user, ownedBorders, fetchProfile } = get();
    if (!user) return;

    // Optimistic Update
    const newBorders = ownedBorders.map(b => ({
      ...b,
      is_equipped: b.id === borderId
    }));
    set({ ownedBorders: newBorders });

    // Optimistic Update for Main Profile (to fix delay)
    // Find the full border object
    const newlyEquipped = newBorders.find(b => b.id === borderId);
    if (newlyEquipped) {
      // Construct the expected profile object update
      // We reuse the existing media_url (which should already have timestamp from fetchBorders if valid)
      // If not, we append it to be safe for the main screen
      let mediaUrl = newlyEquipped.media_url;
      // Removed Anti-Cache Logic to prevent flickering
      if (mediaUrl && mediaUrl.includes('?t=')) {
        mediaUrl = mediaUrl.split('?t=')[0];
      }

      const { profile } = get();
      if (profile) {
        set({
          profile: {
            ...profile,
            equipped_border: {
              ...newlyEquipped,
              media_url: mediaUrl
            }
          }
        });
      }
    } else if (borderId === null) {
      // Unequipped case
      const { profile } = get();
      if (profile) {
        set({
          profile: {
            ...profile,
            equipped_border: null
          }
        });
      }
    }

    // 1. Unequip all
    await db.gamification
      .from('User_owned_border')
      .update({ is_equipped: false })
      .eq('user_id', user.id);

    // 2. Equip new (only if borderId is not null)
    if (borderId) {
      const { error } = await db.gamification
        .from('User_owned_border')
        .update({ is_equipped: true })
        .eq('user_id', user.id)
        .eq('border_id', borderId);

      if (error) {
        ErrorHandlerService.handle(error, { showUI: false });
        // Revert optimization would go here (fetchBorders())
        get().fetchBorders();
        return;
      }
    }

    // We can skip fetchProfile() if the optimistic update worked, 
    // but keeping it as a background sync is safer. 
    // We don't await it to unblock UI.
    fetchProfile();
  },

  fetchTitles: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await db.gamification
      .from('User_titles')
      .select(`
        titleid,
        selected,
        Titles (
          id,
          titlename,
          color
        )
      `)
      .eq('userid', user.id);

    if (error) {
      ErrorHandlerService.handle(error, { showUI: false });
      return;
    }

    if (data) {
      const titles: Title[] = data.map((item: any) => ({
        id: item.Titles?.id || item.titleid, // Fallback if join issue, but id should be in Titles
        name: item.Titles?.titlename || 'Unknown Title',
        color: item.Titles?.color || '#000',
        is_equipped: item.selected,
      }));
      set({ ownedTitles: titles });
    }
  },

  equipTitle: async (titleId: string | null) => {
    const { user, ownedTitles, fetchProfile, fetchTitles } = get();
    if (!user) return;

    // --- Optimistic Update ---
    // Update the ownedTitles list
    const newTitles = ownedTitles.map(t => ({
      ...t,
      is_equipped: t.id === titleId
    }));
    set({ ownedTitles: newTitles });

    // Update the main profile
    const newlyEquipped = newTitles.find(t => t.id === titleId);
    const { profile } = get();
    if (profile) {
      if (newlyEquipped) {
        set({
          profile: {
            ...profile,
            title: newlyEquipped.name,
            titlecolor: newlyEquipped.color,
          }
        });
      } else if (titleId === null) {
        set({
          profile: {
            ...profile,
            title: undefined,
            titlecolor: undefined,
          }
        });
      }
    }
    // --- End Optimistic Update ---

    // 1. Unequip all
    const { error: unequipError } = await db.gamification
      .from('User_titles')
      .update({ selected: false })
      .eq('userid', user.id);

    if (unequipError) {
      ErrorHandlerService.handle(unequipError, { showUI: false });
      get().fetchTitles(); // Revert on error
      return;
    }
    if (titleId) {
      const { error: equipError } = await db.gamification
        .from('User_titles')
        .update({ selected: true })
        .eq('userid', user.id)
        .eq('titleid', titleId);

      if (equipError) {
        ErrorHandlerService.handle(equipError, { showUI: false });
        get().fetchTitles(); // Revert on error
        return;
      }
    }

    // Background sync
    fetchProfile();
  },

  fetchUnclaimedRewards: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await db.gamification
      .from('User_unclaimed_rewards')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      ErrorHandlerService.handle(error, { showUI: false });
      return;
    }
    set({ unclaimedRewards: data || [] });
  },

  fetchRewardsMap: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await db.gamification
        .rpc('get_user_rewards_status', { p_user_id: user.id });

      if (error) {
        ErrorHandlerService.handle(error, { showUI: false });
        return;
      }

      // Process rewards to resolve storage URLs
      const processedRewards = await Promise.all((data || []).map(async (reward: any) => {
        let mediaUrl = reward.media_url;

        // Only process if looks like a path (not http) and exists
        if (mediaUrl && !mediaUrl.startsWith('http')) {
          let mediaPath = mediaUrl;
          // Seasonal fix pattern from fetchBorders
          if (mediaPath.includes('seasonal_summer') || mediaPath.includes('seasonal_winter')) {
            mediaPath = mediaPath.replace('seasonal_summer', 'seasonal').replace('seasonal_winter', 'seasonal');
          }

          // Assume 'border-skins' for now as that's the only one joined. 
          // If we add other types later, we might need a bucket column or logic.
          const { data: storageData } = db.public.storage.from('border-skins').getPublicUrl(mediaPath);

          if (storageData?.publicUrl) {
            mediaUrl = storageData.publicUrl;
          }
        }

        return {
          ...reward,
          media_url: mediaUrl
        };
      }));

      set({ rewardsMap: processedRewards });
    } catch (e) {
      ErrorHandlerService.handle(e, { showUI: false });
    }
  },

  claimReward: async (level: number) => {
    const { user, fetchUnclaimedRewards, fetchProfile, fetchInventory, fetchTitles, fetchBorders } = get();
    if (!user) return false;

    try {
      const { data, error } = await db.gamification.rpc('claim_reward', {
        p_level: level
      });

      if (error) {
        ErrorHandlerService.handle(error, { showUI: false });
        return false;
      }

      if ((data as any)?.success) {
        // Refresh everything that might have changed
        await Promise.all([
          fetchUnclaimedRewards(), // Update list to remove claimed
          fetchProfile(), // Update coins/XP if relevant
          fetchInventory(), // Update items
          fetchTitles(), // Update titles
          fetchBorders(), // Update borders
          get().fetchRewardsMap() // Refresh the map
        ]);
        return true;
      }
      return false;

    } catch (e) {
      ErrorHandlerService.handle(e, { showUI: false });
      return false;
    }
  },

  buyShopItem: async (itemId: string, price: number) => {
    const { user, fetchInventory, fetchProfile } = get();
    if (!user) return { success: false, message: 'Not logged in' };

    try {
      const { data, error } = await db.gamification.rpc('buy_shop_item', {
        p_item_name: itemId,
        p_cost: price
      });

      if (error) throw error;
      const result = data as any;

      if (result.success) {
        fetchProfile();
        fetchInventory();
      }
      return { success: result.success, message: result.message };

    } catch (e: any) {
      const handled = ErrorHandlerService.handle(e, { showUI: false });
      return { success: false, message: handled.userMessage || 'Purchase failed' };
    }
  },

  buyLootbox: async (price: number) => {
    const { user, fetchInventory, fetchProfile } = get();
    if (!user) return { success: false, message: 'Not logged in' };

    try {
      const { data, error } = await db.gamification.rpc('buy_lootbox', {
        p_cost: price
      });

      if (error) throw error;
      const result = data as any;

      if (result.success) {
        fetchProfile();
        fetchInventory();
        return {
          success: true,
          message: result.message,
          rewardType: result.reward_type,
          rewardValue: result.reward_value
        };
      }
      return { success: false, message: result.message };

    } catch (e: any) {
      const handled = ErrorHandlerService.handle(e, { showUI: false });
      return { success: false, message: handled.userMessage || 'Transaction failed' };
    }
  },

  // --- Blocking Logic ---
  blockedUserIds: new Set<string>(),

  fetchBlockedUsers: async () => {
    try {
      const blockedIds = await BlockService.getBlockedUsers();
      set({ blockedUserIds: new Set(blockedIds) });
    } catch (e) {
      ErrorHandlerService.handle(e, { showUI: false });
    }
  },

  blockUser: async (userId: string) => {
    try {
      await BlockService.blockUser(userId);

      const newSet = new Set(get().blockedUserIds);
      newSet.add(userId);
      set({ blockedUserIds: newSet });

    } catch (e: any) {
      ErrorHandlerService.handle(e, { showUI: false });
      throw e;
    }
  },

  unblockUser: async (userId: string) => {
    try {
      await BlockService.unblockUser(userId);

      const newSet = new Set(get().blockedUserIds);
      newSet.delete(userId);
      set({ blockedUserIds: newSet });

    } catch (e: any) {
      ErrorHandlerService.handle(e, { showUI: false });
      throw e;
    }
  },

  isBlocked: (userId: string) => {
    return get().blockedUserIds.has(userId);
  }
}));


