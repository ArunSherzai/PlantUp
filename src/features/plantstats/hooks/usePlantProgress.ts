import { useState, useCallback, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../../../utils/supabase';
import { useUserStore } from '../../../stores/UserStore';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { ErrorHandlerService } from '~/core/error/services/ErrorHandlerService';

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
                .select('id, nickname, created_at, Plant_data!Plants_plant_data_id_fkey(common_name, image_url)')
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
            ErrorHandlerService.handle(err, { showUI: false });
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
            throw new Error('You must be logged in to take a photo.');
        }

        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                throw new Error('Camera permissions are required to take a progress photo.');
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
            const fileName = `${plantId}/${Date.now()}.${fileExt}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await db.public.storage
                .from('plant-progress')
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
            return imageUrl;

        } catch (error: any) {
            ErrorHandlerService.handle(error, { showUI: false });
            throw error;
        } finally {
            setIsUploading(false);
        }
    };

    const uploadProgressPhoto = async (imageUri: string, title: string = 'Progress Update') => {
        if (!user) {
            throw new Error('You must be logged in to upload a photo.');
        }

        try {
            setIsUploading(true);
            const base64FileData = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
            const fileExt = imageUri.split('.').pop() || 'jpg';
            const fileName = `${plantId}/${Date.now()}.${fileExt}`;

            // Upload to Supabase Storage
            const { data: uploadData, error: uploadError } = await db.public.storage
                .from('plant-progress')
                .upload(fileName, decode(base64FileData), {
                    contentType: `image/${fileExt === 'jpg' || fileExt === 'jpeg' ? 'jpeg' : fileExt}`,
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
            return imageUrl;

        } catch (error: any) {
            console.error('Error uploading photo:', error);
            throw error;
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
        uploadProgressPhoto,
        refreshPhotos: fetchPhotos
    };
}
