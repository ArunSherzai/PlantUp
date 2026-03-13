export interface PlantItem {
  id: string;
  name: string;
  type_id?: number;
  description: string;
  image?: any;
  image_url?: string;
  gradientColors?: [string, string];
}
