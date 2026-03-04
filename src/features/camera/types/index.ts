/**
 * Camera Module Types
 * Shared types for the reusable camera feature.
 */

export type CameraMode = 'photo' | 'video';

export type CapturedMedia = {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  mimeType: string;
  fileName: string;
  duration?: number;        // video only, in seconds
  thumbnailUri?: string;    // video only
};
