import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../../../utils/supabase';
import { useUserStore } from '../../../stores/UserStore';
import { decode } from 'base64-arraybuffer';

export interface ProgressPhoto {
    id: string;
    plant_id: string;
    user_id: string;
    title: string;
    image_url: string;
    created_at: string;
}

export interface PlantDetails {
    id: string;
    nickname: string;
    created_at: string;
    image_url?: string;
    common_name?: string;
}

export function usePlantProgress(plantId: string) {
    const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
    const [plantDetails, setPlantDetails] = useState<PlantDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const { user } = useUserStore();

    const fetchPhotos = useCallback(async () => {
        if (!plantId) return;
        setLoading(true);
        try {
            // Fetch Photos
            const { data: photosData, error: photosError } = await db.social
                .from('Plant_progress_photos')
                .select('*')
                .eq('plant_id', plantId)
                .order('created_at', { ascending: true }); // Chronological order for timeline

            if (photosError) throw photosError;
            if (photosData) setPhotos(photosData as ProgressPhoto[]);

            // Fetch Plant Details
            const { data: plantData, error: plantError } = await db.social
                .from('Plants')
                .select('id, nickname, created_at, Plant_data(common_name, image_url)')
                .eq('id', plantId)
                .single();

            if (plantError) throw plantError;
            if (plantData) {
                // @ts-ignore - Supabase join types can be tricky
                const pDataList = plantData.Plant_data;
                const pData = Array.isArray(pDataList) ? pDataList[0] : pDataList;

                setPlantDetails({
                    id: plantData.id,
                    nickname: plantData.nickname || 'Unknown Plant',
                    created_at: plantData.created_at || new Date().toISOString(),
                    image_url: pData?.image_url,
                    common_name: pData?.common_name,
                });
            }

        } catch (err) {
            console.error('Fetch photos failed:', err);
        } finally {
            setLoading(false);
        }
    }, [plantId]);

    useEffect(() => {
        fetchPhotos();
    }, [fetchPhotos]);

    const canTakePhoto = () => {
        return true;
    };

    const takePhoto = async (title: string = 'Progress Update') => {
        if (!user) {
            Alert.alert('Error', 'You must be logged in to take a photo.');
            return false;
        }

        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permissions are required to take a progress photo.');
                return false;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                quality: 0.8,
                base64: true,
            });

            if (result.canceled || !result.assets || !result.assets[0].base64) {
                return false;
            }

            setIsUploading(true);
            const asset = result.assets[0];
            const base64FileData = asset.base64;
            const fileExt = asset.uri.split('.').pop() || 'jpg';
            const fileName = `${user.id}/${plantId}_${Date.now()}.${fileExt}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await db.public.storage
                .from('post-media') // Reusing existing bucket as assumed
                .upload(fileName, decode(base64FileData as string), {
                    contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
                    upsert: false,
                });

            if (uploadError) {
                throw new Error(`Failed to upload image: ${uploadError.message}`);
            }

            // Insert record into DB
            const imageUrl = uploadData?.path || '';

            const { error: dbError } = await db.social
                .from('Plant_progress_photos')
                .insert([
                    {
                        plant_id: plantId,
                        user_id: user.id,
                        title,
                        image_url: imageUrl,
                    }
                ]);

            if (dbError) {
                throw new Error(`Failed to save record: ${dbError.message}`);
            }

            await fetchPhotos(); // Refresh list after success
            return true;

        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Upload Failed', error instanceof Error ? error.message : 'An unknown error occurred.');
            return false;
        } finally {
            setIsUploading(false);
        }
    };

    return {
        photos,
        plantDetails,
        loading,
        isUploading,
        canTakePhoto,
        takePhoto,
        refreshPhotos: fetchPhotos
    };
}
