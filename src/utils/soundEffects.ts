import { Audio } from 'expo-av';

let sendSound: Audio.Sound | null = null;
let receiveSound: Audio.Sound | null = null;

export const initializeSounds = async () => {
    try {
        // Set audio mode
        await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
        });

        // Load sounds
        const { sound: send } = await Audio.Sound.createAsync(
            require('../../assets/sounds/send.wav')
        );
        sendSound = send;

        const { sound: rec } = await Audio.Sound.createAsync(
            require('../../assets/sounds/rec.wav')
        );
        receiveSound = rec;

        console.log('[SoundEffects] Sounds initialized successfully');
    } catch (error) {
        console.error('[SoundEffects] Error initializing sounds:', error);
    }
};

export const playSendSound = async () => {
    try {
        if (sendSound) {
            await sendSound.setPositionAsync(0);
            await sendSound.playAsync();
        }
    } catch (error) {
        console.error('[SoundEffects] Error playing send sound:', error);
    }
};

export const playReceiveSound = async () => {
    try {
        if (receiveSound) {
            await receiveSound.setPositionAsync(0);
            await receiveSound.playAsync();
        }
    } catch (error) {
        console.error('[SoundEffects] Error playing receive sound:', error);
    }
};

export const unloadSounds = async () => {
    try {
        if (sendSound) {
            await sendSound.unloadAsync();
            sendSound = null;
        }
        if (receiveSound) {
            await receiveSound.unloadAsync();
            receiveSound = null;
        }
        console.log('[SoundEffects] Sounds unloaded successfully');
    } catch (error) {
        console.error('[SoundEffects] Error unloading sounds:', error);
    }
};
