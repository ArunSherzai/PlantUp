import { useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { db } from '../utils/supabase';
import { getTriggeredTip, getRandomGeneralTip, PlantDataInput, TipObject } from '../utils/tipResolver';
import { saveTip } from '../utils/tipHistory';
import { useTipStore } from '../stores/TipStore';
import { useUserStore } from '../stores/UserStore';
import { useTutorialStore } from '../stores/TutorialStore';
import { NotificationService } from '../services/NotificationService';
import { useInboxStore } from '../stores/InboxStore';
import { fetchPrimaryPlantAlertTip } from '../features/alerts/api/plantAlertsApi';

export function usePlantTipSystem() {
    const {
        setActiveTip,
        activeTip,
        latestPlantData,
        setLatestPlantData,
        setLatestThresholds,
        wasTipShownRecently,
        markTipShown,
        isPaused,
        addToQueue,
        pendingQueue,
        popFromQueue,
    } = useTipStore();

    const { sprigNotificationsEnabled } = useUserStore();

    const getTipPriority = (tip: TipObject): number => {
        if (tip.severity === 'critical') return 3;
        if (tip.severity === 'warning') return 2;
        return 1;
    };

    useEffect(() => {
        if (!sprigNotificationsEnabled) {
            setActiveTip(null);
        }
    }, [sprigNotificationsEnabled, setActiveTip]);

    const sendPushNotification = async (tip: TipObject) => {
        let title = tip.title || 'PlantUp Advice';
        let category: 'critical' | 'warning' | 'general' = 'general';

        if (tip.severity === 'critical') {
            title = tip.title || 'Sprig Emergency!';
            category = 'critical';
        } else if (tip.severity === 'warning') {
            title = tip.title || 'Sprig Warning';
            category = 'warning';
        }

        const data: any = {};
        if (tip.plantId) {
            data.plantId = tip.plantId;
        }

        await NotificationService.sendNotification(title, tip.message, category, data);
    };

    const setAndSaveTip = (tip: TipObject | null, options?: { force?: boolean }) => {
        const force = options?.force === true;
        const dedupeKey = tip?.dedupeKey ?? tip?.message;
        const activeKey = activeTip?.dedupeKey ?? activeTip?.message;

        if (tip && !force && activeKey === dedupeKey) {
            return;
        }

        if (tip && !force && dedupeKey && wasTipShownRecently(dedupeKey)) {
            return;
        }

        if (tip && AppState.currentState === 'active') {
            useInboxStore.getState().addNotification({
                kind: tip.severity === 'critical' ? 'critical' : tip.severity === 'warning' ? 'warning' : 'general',
                title: tip.title || (
                    tip.severity === 'critical'
                        ? 'Sprig Emergency!'
                        : tip.severity === 'warning'
                            ? 'Sprig Warning'
                            : 'PlantUp Advice'
                ),
                body: tip.message,
                groupKey: tip.plantId
                    ? `${tip.severity}:${tip.plantId}`
                    : undefined,
                navigationTarget: tip.plantId
                    ? {
                        name: 'PlantStats',
                        params: {
                            plantId: tip.plantId,
                            onlyShowSelected: true,
                        },
                    }
                    : {
                        name: 'TabNavigator',
                    },
            });
        }

        if (tip && AppState.currentState !== 'active') {
            sendPushNotification(tip);
        }

        if (tip && isPaused) {
            console.log('Sprig is paused. Queuing tip:', tip.message);
            addToQueue(tip);
            return;
        }

        if (tip) {
            const profile = useUserStore.getState().profile;
            const tutorialProgress = profile?.tutorial_progress || {};
            if (profile && !tutorialProgress['notifications_tutorial']) {
                useTutorialStore.getState().startTutorial('notifications_tutorial');
                return;
            }
        }

        setActiveTip(tip);
        if (tip) {
            if (dedupeKey) {
                markTipShown(dedupeKey);
            }
            saveTip(tip);
        }
    };

    const checkPlantHealthLocalFallback = useCallback(async () => {
        const { data: { user } } = await db.public.auth.getUser();
        if (!user) return false;

        const { data: plants } = await db.social
            .from('Plants')
            .select('id, nickname, plant_data:Plant_data(*)')
            .eq('user_id', user.id);

        if (!plants || plants.length === 0) return false;

        let bestTip: TipObject | null = null;
        let bestInfoTip: TipObject | null = null;

        for (const plant of plants) {
            const { data: latestController } = await db.micro
                .from('Controllers')
                .select('temperature, humidity, soil_moisture, light, electrical_conductivity, created_at')
                .eq('plant_id', plant.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            const { data: latestProgress } = await db.social
                .from('Plant_progress_photos')
                .select('created_at')
                .eq('plant_id', plant.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            let needsProgressPhoto = false;
            if (!latestProgress) {
                needsProgressPhoto = true;
            } else {
                const lastPhotoDate = new Date(latestProgress.created_at);
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                if (lastPhotoDate < sevenDaysAgo) {
                    needsProgressPhoto = true;
                }
            }

            if (!latestController) {
                if (needsProgressPhoto && !bestInfoTip) {
                    bestInfoTip = {
                        title: 'Progress Photo Due',
                        message: `Time to take a progress photo for ${plant.nickname || 'your plant'}!`,
                        severity: 'info',
                        plantId: plant.id,
                        dedupeKey: `progress-photo:${plant.id}`,
                        source: 'fallback',
                    };
                }
                continue;
            }

            const plantData: PlantDataInput = {
                plantName: plant.nickname || 'your plant',
                soilMoisture: latestController.soil_moisture,
                lightLevel: latestController.light,
                temperature: latestController.temperature,
                humidityLevel: latestController.humidity,
                ecValue: latestController.electrical_conductivity,
            };

            const thresholds = Array.isArray(plant.plant_data) ? plant.plant_data[0] : plant.plant_data;

            setLatestPlantData(plantData);
            setLatestThresholds(thresholds);

            const tip = getTriggeredTip(plantData, thresholds);

            if (tip) {
                const enrichedTip: TipObject = {
                    ...tip,
                    plantId: plant.id,
                    dedupeKey: `fallback:${plant.id}:${tip.message}`,
                    source: 'fallback',
                };

                if (!bestTip || getTipPriority(enrichedTip) > getTipPriority(bestTip)) {
                    bestTip = enrichedTip;
                }
            }

            if (needsProgressPhoto && !bestInfoTip) {
                bestInfoTip = {
                    title: 'Progress Photo Due',
                    message: `Time to take a progress photo for ${plant.nickname || 'your plant'}!`,
                    severity: 'info',
                    plantId: plant.id,
                    dedupeKey: `progress-photo:${plant.id}`,
                    source: 'fallback',
                };
            }
        }

        if (bestTip) {
            setAndSaveTip(bestTip);
            return true;
        }

        if (bestInfoTip) {
            setAndSaveTip(bestInfoTip);
            return true;
        }

        return false;
    }, [setLatestPlantData, setLatestThresholds, activeTip, wasTipShownRecently, markTipShown]);

    useEffect(() => {
        if (!isPaused && !activeTip && pendingQueue.length > 0) {
            const nextTip = popFromQueue();
            if (nextTip) {
                console.log('Sprig resuming. Showing queued tip:', nextTip.message);
                setAndSaveTip(nextTip);
            }
        }
    }, [isPaused, pendingQueue, activeTip]);

    const checkPlantHealth = useCallback(async () => {
        await useUserStore.getState().loadSettings();
        if (!useUserStore.getState().sprigNotificationsEnabled) return false;

        try {
            try {
                const alertTip = await fetchPrimaryPlantAlertTip();
                if (alertTip) {
                    setAndSaveTip(alertTip);
                    return true;
                }
            } catch (rpcErr) {
                console.log('[PlantTipSystem] Alert RPC unavailable, falling back to local scan:', rpcErr);
            }

            return await checkPlantHealthLocalFallback();
        } catch (err) {
            console.log('Polling error:', err);
            return false;
        }
    }, [checkPlantHealthLocalFallback]);

    useEffect(() => {
        checkPlantHealth();

        const interval = setInterval(checkPlantHealth, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, [checkPlantHealth]);

    useEffect(() => {
        const interval = setInterval(async () => {
            await useUserStore.getState().loadSettings();
            if (!useUserStore.getState().sprigNotificationsEnabled) return;

            if (!activeTip) {
                const randomTip: TipObject = {
                    ...getRandomGeneralTip(),
                    title: 'PlantUp Advice',
                    dedupeKey: `general:${Date.now()}`,
                    source: 'general',
                };
                setAndSaveTip(randomTip);
            }
        }, 30 * 60 * 1000);

        return () => clearInterval(interval);
    }, [activeTip, isPaused]);

    const triggerManualTip = async () => {
        await useUserStore.getState().loadSettings();
        if (!useUserStore.getState().sprigNotificationsEnabled) return;

        try {
            const alertTip = await fetchPrimaryPlantAlertTip();
            if (alertTip) {
                setAndSaveTip(alertTip, { force: true });
                return;
            }
        } catch (rpcErr) {
            console.log('[PlantTipSystem] Manual alert fetch failed, falling back:', rpcErr);
        }

        const { latestPlantData, latestThresholds } = useTipStore.getState();

        if (latestPlantData) {
            const tip = getTriggeredTip(latestPlantData, latestThresholds);
            if (tip) {
                setAndSaveTip({
                    ...tip,
                    dedupeKey: `manual:${tip.message}`,
                    source: 'fallback',
                }, { force: true });
                return;
            }
        }

        const generalTip: TipObject = {
            ...getRandomGeneralTip(),
            title: 'PlantUp Advice',
            dedupeKey: `general:${Date.now()}`,
            source: 'general',
        };
        setAndSaveTip(generalTip, { force: true });
    };

    const dismissTip = () => {
        setActiveTip(null);
    };

    return {
        triggerManualTip,
        checkPlantHealth,
        activeTip,
        dismissTip,
        latestPlantData,
    };
}


