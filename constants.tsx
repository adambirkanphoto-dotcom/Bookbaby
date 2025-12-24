
import { SpreadDimension, PhotoImage } from './types';

export const DIMENSION_LABELS: Record<SpreadDimension, string> = {
  '1:1': 'Square (1:1)',
  '2:3': 'Portrait (2:3)',
  '3:2': 'Landscape (3:2)',
  '4:5': 'Portrait (4:5)',
  '5:4': 'Landscape (5:4)',
  'A4_Landscape': 'A4 Landscape',
  'A4_Portrait': 'A4 Portrait',
  'Custom': 'Custom Dimensions'
};

export const DIMENSION_RATIOS: Record<SpreadDimension, number> = {
  '1:1': 1,
  '2:3': 0.6666,
  '3:2': 1.5,
  '4:5': 0.8,
  '5:4': 1.25,
  'A4_Landscape': 1.414,
  'A4_Portrait': 0.707,
  'Custom': 1 // Default fallback
};

export const INITIAL_IMAGES: PhotoImage[] = [];
