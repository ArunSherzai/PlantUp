/**
 * SoundManager - Centralized Sound System for PlantUp
 * 
 * Provides a single source of truth for all app sounds with:
 * - Preloading of core UI sounds
 * - Debounce/cooldown to prevent spam
 * - Global enable/disable setting
 * - App state awareness (no sounds in background)
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

// Sound type definitions
export type SoundType =
    | 'click'
    | 'confirm'
    | 'reload'
    | 'send'
    | 'receive'
    | 'xp_boost'
    | 'xp_multiplier'
    | 'xp_fill'
    | 'xp_lost'
    | 'streak_activate'
    | 'freeze_activate'
    | 'freeze_used'
    | 'lootbox_open'
    | 'lootbox_reward'
    | 'sprig_noti';

// Sound file mappings
const SOUND_FILES: Record<SoundType, any> = {
    click: require('../../assets/sounds/click.wav'),
    confirm: require('../../assets/sounds/confirm.wav'),
    reload: require('../../assets/sounds/reload.wav'),
    send: require('../../assets/sounds/send.wav'),
    receive: require('../../assets/sounds/rec.wav'),
    // Gamification sounds - now using correct files
    xp_boost: require('../../assets/sounds/Smooth_XP_boost_acti_#3-1767787641194.mp3'),
    xp_multiplier: require('../../assets/sounds/XP_multiplier_activa_#1-1767788452517.wav'),
    xp_fill: require('../../assets/sounds/XP_fill-up_sound_for_#3-1767788716444.wav'),
    xp_lost: require('../../assets/sounds/Low-pitched_XP_fill__#4-1767788879699.wav'),
    streak_activate: require('../../assets/sounds/Streak_activation_so_#1-1767788037689.wav'),
    freeze_activate: require('../../assets/sounds/Instant_freeze_activ_#4-1767787155210.wav'),
    freeze_used: require('../../assets/sounds/Instant_freeze_activ_#4-1767787331633.wav'),
    lootbox_open: require('../../assets/sounds/Suspenseful_build-up_#4-1767786625807.wav'),
    lootbox_reward: require('../../assets/sounds/Long-form_UI_reward__#4-1767786467081.wav'),
    sprig_noti: require('../../assets/sounds/SprigNoti.wav'),
};

// Sounds to preload at startup (most frequently used)
const PRELOAD_SOUNDS: SoundType[] = ['click', 'confirm', 'reload'];

// Debounce settings (in ms)
const DEBOUNCE_MS: Partial<Record<SoundType, number>> = {
    click: 100,
};

const STORAGE_KEY = '@PlantUp:soundEnabled';

class SoundManagerClass {
    private sounds: Map<SoundType, Audio.Sound> = new Map();
    private lastPlayTime: Map<SoundType, number> = new Map();
    private enabled: boolean = true;
    private initialized: boolean = false;
    private appState: AppStateStatus = 'active';
    private appStateSubscription: any = null;

    /**
     * Initialize the sound system
     * Call this once on app startup
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            // Set audio mode
            await Audio.setAudioModeAsync({
                playsInSilentModeIOS: false, // Respect device mute switch
                staysActiveInBackground: false,
                shouldDuckAndroid: true,
            });

            // Load enabled setting from storage
            const storedEnabled = await AsyncStorage.getItem(STORAGE_KEY);
            if (storedEnabled !== null) {
                this.enabled = storedEnabled === 'true';
            }

            // Preload core sounds
            await this.preloadSounds();

            // Listen to app state changes
            this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);

            this.initialized = true;
            console.log('[SoundManager] Initialized successfully');
        } catch (error) {
            console.error('[SoundManager] Error initializing:', error);
        }
    }

    /**
     * Preload frequently used sounds for instant playback
     */
    private async preloadSounds(): Promise<void> {
        for (const soundType of PRELOAD_SOUNDS) {
            try {
                await this.loadSound(soundType);
            } catch (error) {
                console.warn(`[SoundManager] Failed to preload ${soundType}:`, error);
            }
        }
    }

    /**
     * Load a single sound into memory
     */
    private async loadSound(type: SoundType): Promise<Audio.Sound | undefined> {
        try {
            const { sound } = await Audio.Sound.createAsync(SOUND_FILES[type], {
                shouldPlay: false,
            });
            this.sounds.set(type, sound);
            return sound;
        } catch (error) {
            console.error(`[SoundManager] Error loading sound ${type}:`, error);
            return undefined;
        }
    }

    /**
     * Handle app state changes (active, background, inactive)
     */
    private handleAppStateChange = (nextAppState: AppStateStatus): void => {
        this.appState = nextAppState;
    };

    /**
     * Play a sound by type
     * @param type - The sound type to play
     * @param options - Optional playback options
     */
    async play(type: SoundType, options?: { volume?: number }): Promise<void> {
        // Skip if disabled or app in background
        if (!this.enabled || this.appState !== 'active') {
            return;
        }

        // Check debounce
        const debounceTime = DEBOUNCE_MS[type];
        if (debounceTime) {
            const lastPlay = this.lastPlayTime.get(type) || 0;
            const now = Date.now();
            if (now - lastPlay < debounceTime) {
                return; // Skip, still in cooldown
            }
            this.lastPlayTime.set(type, now);
        }

        try {
            // Get or load the sound
            let sound = this.sounds.get(type);
            if (!sound) {
                sound = await this.loadSound(type);
                if (!sound) return;
            }

            // Reset to beginning and play
            await sound.setPositionAsync(0);
            if (options?.volume !== undefined) {
                await sound.setVolumeAsync(options.volume);
            }
            await sound.playAsync();
        } catch (error) {
            console.error(`[SoundManager] Error playing sound ${type}:`, error);
        }
    }

    /**
     * Set whether sounds are enabled
     */
    async setEnabled(enabled: boolean): Promise<void> {
        this.enabled = enabled;
        try {
            await AsyncStorage.setItem(STORAGE_KEY, enabled.toString());
            console.log(`[SoundManager] Sound ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error('[SoundManager] Error saving enabled state:', error);
        }
    }

    /**
     * Get whether sounds are enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Cleanup all sounds (call on app unmount)
     */
    async cleanup(): Promise<void> {
        try {
            // Unload all sounds
            for (const [type, sound] of this.sounds) {
                await sound.unloadAsync();
            }
            this.sounds.clear();

            // Remove app state listener
            if (this.appStateSubscription) {
                this.appStateSubscription.remove();
                this.appStateSubscription = null;
            }

            this.initialized = false;
            console.log('[SoundManager] Cleaned up successfully');
        } catch (error) {
            console.error('[SoundManager] Error during cleanup:', error);
        }
    }
}

// Export singleton instance
export const SoundManager = new SoundManagerClass();

// Convenience function for quick access
export const playSound = (type: SoundType, options?: { volume?: number }): void => {
    SoundManager.play(type, options);
};
