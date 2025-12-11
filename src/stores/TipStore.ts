import { create } from 'zustand';
import { TipObject, PlantDataInput, PlantThresholds } from '../utils/tipResolver';

interface TipState {
    activeTip: TipObject | null;
    latestPlantData: PlantDataInput | null;
    latestThresholds: PlantThresholds | null;
    setActiveTip: (tip: TipObject | null) => void;
    setLatestPlantData: (data: PlantDataInput | null) => void;
    setLatestThresholds: (thresholds: PlantThresholds | null) => void;
}

export const useTipStore = create<TipState>((set) => ({
    activeTip: null,
    latestPlantData: null,
    latestThresholds: null,
    setActiveTip: (tip) => set({ activeTip: tip }),
    setLatestPlantData: (data) => set({ latestPlantData: data }),
    setLatestThresholds: (thresholds) => set({ latestThresholds: thresholds }),
}));
