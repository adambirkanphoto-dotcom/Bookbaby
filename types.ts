
export type SpreadDimension = '8x8' | '10x10' | 'A4_Landscape' | 'A4_Portrait' | 'Custom';

export interface PhotoImage {
  id: string;
  url: string;
  name: string;
  aspectRatio: number;
}

export type PageLayout = 'single' | 'double' | 'grid-4' | 'spread';

export interface PageConfig {
  id: string;
  layout: PageLayout;
  cropType: 'fill' | 'fit';
  margin: number; // 0-10 scale where 0 is full bleed
}

export interface SpreadData {
  leftPage: PageConfig;
  rightPage: PageConfig;
}

export interface AppState {
  images: PhotoImage[];
  dimension: SpreadDimension;
  pageConfigs: PageConfig[];
}
