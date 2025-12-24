
export type SpreadDimension = '1:1' | '2:3' | '3:2' | '4:5' | '5:4' | 'A4_Landscape' | 'A4_Portrait' | 'Custom';

export interface ImageOffset {
  x: number;
  y: number;
}

export interface PhotoImage {
  id: string;
  url: string;
  name: string;
  aspectRatio: number;
}

export interface Frame {
  id: string;
  imageId: string | null;
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
  width: number; // Percentage (0-100)
  height: number; // Percentage (0-100)
  zIndex: number;
  cropType: 'fill' | 'fit';
  scale: number;
  offset: ImageOffset;
  isLocked: boolean;
  isSpread?: boolean;
}

export interface PageConfig {
  id: string;
  frames: Frame[];
  margin: number; // 0-10 scale (bleed)
}

export interface AppState {
  images: PhotoImage[];
  dimension: SpreadDimension;
  pageConfigs: PageConfig[];
}
