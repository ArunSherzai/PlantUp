/**
 * Camera & Editor Module Types
 */

export type CameraMode = 'photo' | 'video';

export type CapturedMedia = {
  uri: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  mimeType: string;
  fileName: string;
  duration?: number;
  thumbnailUri?: string;
};

// --- Filter Types ---

export type ImageAdjustments = {
  brightness: number;   // -100 to 100
  contrast: number;     // -100 to 100
  saturation: number;   // -100 to 100
  warmth: number;       // -100 to 100
};

export type FilterPreset = {
  id: string;
  name: string;
  icon: string;
  adjustments: ImageAdjustments;
};

// --- Editor Types ---

export type CropData = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export type TextOverlay = {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  fontWeight: 'normal' | 'bold';
  rotation: number;
};

export type EditState = {
  uri: string;
  originalUri: string;
  adjustments: ImageAdjustments;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
  crop?: CropData;
  textOverlays: TextOverlay[];
  activeFilter?: string;
};

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
};

export const DEFAULT_EDIT_STATE = (uri: string): EditState => ({
  uri,
  originalUri: uri,
  adjustments: { ...DEFAULT_ADJUSTMENTS },
  rotation: 0,
  flipH: false,
  flipV: false,
  textOverlays: [],
});
