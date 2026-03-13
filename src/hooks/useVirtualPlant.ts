import { useState, useEffect, useCallback } from 'react';
import { db } from '../utils/supabase';
import { useUserStore } from '../stores/UserStore';
import { PotType } from '../components/PotModel';
import { ErrorHandlerService } from '../core/error/services/ErrorHandlerService';

export interface VirtualPlant {
    id: string;
    user_id: string;
    seed: number;
    pot_type: PotType;
    created_at: string;
    updated_at: string;
}

export interface VirtualPlantData {
    plant: VirtualPlant | null;
    growth: number; // Derived from user level
    loading: boolean;
    error: string | null;
}

/**
 * Hook to fetch virtual plant data from gamification.virtual_plants
 * Growth is derived from user's level (clamped to 0-100)
 */
export function useVirtualPlant(userId?: string): VirtualPlantData & {
    refetch: () => Promise<void>;
    createPlant: () => Promise<VirtualPlant | null>;
    updatePotType: (potType: PotType) => Promise<void>;
    regenerateSeed: () => Promise<void>;
} {
    const [plant, setPlant] = useState<VirtualPlant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get user level from UserStore for growth
    const profile = useUserStore((state) => state.profile);
    const user = useUserStore((state) => state.user);

    const targetUserId = userId || user?.id;

    // Growth is the user's level, clamped to 0-100
    const growth = Math.min(100, Math.max(0, profile?.level ?? 1));

    console.log('[useVirtualPlant] User level:', profile?.level, '-> Growth:', growth);

    const fetchPlant = useCallback(async () => {
        if (!targetUserId) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const { data, error: fetchError } = await db.gamification
                .from('virtual_plants')
                .select('*')
                .eq('user_id', targetUserId)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') {
                // PGRST116 = no rows returned (plant doesn't exist yet)
                throw fetchError;
            }

            console.log('[useVirtualPlant] Fetched plant from DB:', data);
            setPlant(data as VirtualPlant | null);
        } catch (err: any) {
            ErrorHandlerService.handle(err, { showUI: false });
            setError(err?.message || 'Failed to fetch plant');
        } finally {
            setLoading(false);
        }
    }, [targetUserId]);

    const createPlant = useCallback(async (): Promise<VirtualPlant | null> => {
        if (!targetUserId) return null;

        try {
            setLoading(true);
            setError(null);

            const { data, error: insertError } = await db.gamification
                .from('virtual_plants')
                .insert({ user_id: targetUserId })
                .select()
                .single();

            if (insertError) throw insertError;

            const newPlant = data as VirtualPlant;
            setPlant(newPlant);
            return newPlant;
        } catch (err: any) {
            ErrorHandlerService.handle(err, { showUI: false });
            setError(err?.message || 'Failed to create plant');
            return null;
        } finally {
            setLoading(false);
        }
    }, [targetUserId]);

    const updatePotType = useCallback(async (potType: PotType) => {
        if (!targetUserId || !plant) return;

        try {
            const { error: updateError } = await db.gamification
                .from('virtual_plants')
                .update({ pot_type: potType })
                .eq('user_id', targetUserId);

            if (updateError) throw updateError;

            setPlant((prev) => prev ? { ...prev, pot_type: potType } : null);
        } catch (err: any) {
            ErrorHandlerService.handle(err, { showUI: false });
            setError(err?.message || 'Failed to update pot type');
        }
    }, [targetUserId, plant]);

    const regenerateSeed = useCallback(async () => {
        if (!targetUserId || !plant) return;

        const newSeed = Math.floor(Math.random() * 100000);

        try {
            const { error: updateError } = await db.gamification
                .from('virtual_plants')
                .update({ seed: newSeed })
                .eq('user_id', targetUserId);

            if (updateError) throw updateError;

            setPlant((prev) => prev ? { ...prev, seed: newSeed } : null);
        } catch (err: any) {
            ErrorHandlerService.handle(err, { showUI: false });
            setError(err?.message || 'Failed to regenerate seed');
        }
    }, [targetUserId, plant]);

    useEffect(() => {
        fetchPlant();
    }, [fetchPlant]);

    return {
        plant,
        growth,
        loading,
        error,
        refetch: fetchPlant,
        createPlant,
        updatePotType,
        regenerateSeed,
    };
}
