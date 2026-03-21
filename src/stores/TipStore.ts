import { create } from 'zustand';
import { TipObject, PlantDataInput, PlantThresholds } from '../utils/tipResolver';

interface TipState {
    activeTip: TipObject | null;
    latestPlantData: PlantDataInput | null;
    latestThresholds: PlantThresholds | null;
    recentTipKeys: Record<string, number>;

    // Pause Logic
    isPaused: boolean;
    pendingQueue: TipObject[];

    setActiveTip: (tip: TipObject | null) => void;
    setLatestPlantData: (data: PlantDataInput | null) => void;
    setLatestThresholds: (thresholds: PlantThresholds | null) => void;
    wasTipShownRecently: (key: string, cooldownMs?: number) => boolean;
    markTipShown: (key: string) => void;

    setPaused: (paused: boolean) => void;
    addToQueue: (tip: TipObject) => void;
    popFromQueue: () => TipObject | undefined;
}

export const useTipStore = create<TipState>((set, get) => ({
    activeTip: null,
    latestPlantData: null,
    latestThresholds: null,
    recentTipKeys: {},
    isPaused: false,
    pendingQueue: [],

    setActiveTip: (tip) => set({ activeTip: tip }),
    setLatestPlantData: (data) => set({ latestPlantData: data }),
    setLatestThresholds: (thresholds) => set({ latestThresholds: thresholds }),
    wasTipShownRecently: (key, cooldownMs = 6 * 60 * 60 * 1000) => {
        const ts = get().recentTipKeys[key];
        if (!ts) return false;
        return Date.now() - ts < cooldownMs;
    },
    markTipShown: (key) => set((state) => ({
        recentTipKeys: {
            ...state.recentTipKeys,
            [key]: Date.now(),
        },
    })),

    setPaused: (paused) => set({ isPaused: paused }),
    addToQueue: (tip) => set((state) => ({ pendingQueue: [...state.pendingQueue, tip] })),
    popFromQueue: () => {
        const { pendingQueue } = get();
        if (pendingQueue.length === 0) return undefined;
        const [next, ...rest] = pendingQueue;
        set({ pendingQueue: rest });
        return next;
    }
}));
