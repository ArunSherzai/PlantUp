import { useState, useRef, useCallback, useEffect } from 'react';
import { CameraView } from 'expo-camera';
import * as VideoThumbnails from 'expo-video-thumbnails';
import type { CapturedMedia, CameraMode } from '../types';

/**
 * Hook to manage photo/video capture logic.
 * Encapsulates all capture state and actions.
 */
export function useCameraCapture(cameraRef: React.RefObject<CameraView | null>) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [capturedMedia, setCapturedMedia] = useState<CapturedMedia | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const takePhoto = useCallback(async (): Promise<CapturedMedia | null> => {
    if (!cameraRef.current) return null;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (!photo) return null;

      const media: CapturedMedia = {
        uri: photo.uri,
        type: 'image',
        width: photo.width,
        height: photo.height,
        mimeType: 'image/jpeg',
        fileName: `photo_${Date.now()}.jpg`,
      };

      setCapturedMedia(media);
      return media;
    } catch (error) {
      console.error('[Camera] Failed to take photo:', error);
      return null;
    }
  }, [cameraRef]);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording) return;

    setIsRecording(true);
    setRecordingDuration(0);

    // Start duration timer
    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: 60,
      });

      // Clear timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (!video) {
        setIsRecording(false);
        return;
      }

      // Generate thumbnail
      let thumbnailUri: string | undefined;
      try {
        const thumb = await VideoThumbnails.getThumbnailAsync(video.uri, { time: 0 });
        thumbnailUri = thumb.uri;
      } catch (e) {
        console.warn('[Camera] Could not generate video thumbnail:', e);
      }

      const media: CapturedMedia = {
        uri: video.uri,
        type: 'video',
        mimeType: 'video/mp4',
        fileName: `video_${Date.now()}.mp4`,
        thumbnailUri,
      };

      setCapturedMedia(media);
      setIsRecording(false);
    } catch (error) {
      console.error('[Camera] Failed to record video:', error);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsRecording(false);
    }
  }, [cameraRef, isRecording]);

  const stopRecording = useCallback(() => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  }, [cameraRef, isRecording]);

  const clearCapture = useCallback(() => {
    setCapturedMedia(null);
  }, []);

  return {
    takePhoto,
    startRecording,
    stopRecording,
    isRecording,
    recordingDuration,
    capturedMedia,
    clearCapture,
  };
}
