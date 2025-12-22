
import { SpreadDimension, PhotoImage } from './types';

export const DIMENSION_LABELS: Record<SpreadDimension, string> = {
  '8x8': '8" x 8" Square',
  '10x10': '10" x 10" Square',
  'A4_Landscape': 'A4 Landscape',
  'A4_Portrait': 'A4 Portrait',
  'Custom': 'Custom Dimensions'
};

export const DIMENSION_RATIOS: Record<SpreadDimension, number> = {
  '8x8': 1,
  '10x10': 1,
  'A4_Landscape': 1.414,
  'A4_Portrait': 0.707,
  'Custom': 1 // Default fallback
};

export const INITIAL_IMAGES: PhotoImage[] = [];
