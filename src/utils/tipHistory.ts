import AsyncStorage from '@react-native-async-storage/async-storage';
import { TipObject } from './tipResolver';

const TIP_HISTORY_KEY = 'plantup_tip_history';

export interface StoredTip extends TipObject {
    timestamp: number;
    id: string;
}

export const saveTip = async (tip: TipObject) => {
    try {
        const newTip: StoredTip = {
            ...tip,
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9),
        };

        const existingHistory = await getTipHistory();
        const updatedHistory = [newTip, ...existingHistory];

        // Limit history to last 50 tips to prevent storage bloat
        const trimmedHistory = updatedHistory.slice(0, 50);

        await AsyncStorage.setItem(TIP_HISTORY_KEY, JSON.stringify(trimmedHistory));
        return newTip;
    } catch (error) {
        console.error('Error saving tip history:', error);
        return null;
    }
};

export const getTipHistory = async (): Promise<StoredTip[]> => {
    try {
        const history = await AsyncStorage.getItem(TIP_HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('Error fetching tip history:', error);
        return [];
    }
};

export const getLatestTip = async (): Promise<StoredTip | null> => {
    try {
        const history = await getTipHistory();
        return history.length > 0 ? history[0] : null;
    } catch (error) {
        console.error('Error fetching latest tip:', error);
        return null;
    }
};
