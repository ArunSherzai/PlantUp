import type { FilterPreset } from '../types';

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'original',
    name: 'Original',
    icon: 'circle',
    adjustments: { brightness: 0, contrast: 0, saturation: 0, warmth: 0 },
  },
  {
    id: 'vivid',
    name: 'Vivid',
    icon: 'sun',
    adjustments: { brightness: 10, contrast: 20, saturation: 30, warmth: 0 },
  },
  {
    id: 'cool',
    name: 'Cool',
    icon: 'snowflake',
    adjustments: { brightness: 0, contrast: 5, saturation: -10, warmth: -30 },
  },
  {
    id: 'warm',
    name: 'Warm',
    icon: 'fire',
    adjustments: { brightness: 5, contrast: 0, saturation: 10, warmth: 35 },
  },
  {
    id: 'bloom',
    name: 'Bloom',
    icon: 'seedling',
    adjustments: { brightness: 15, contrast: -10, saturation: 20, warmth: 10 },
  },
  {
    id: 'fade',
    name: 'Fade',
    icon: 'ghost',
    adjustments: { brightness: 10, contrast: -20, saturation: -20, warmth: 0 },
  },
];
