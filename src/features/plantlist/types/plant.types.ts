export interface PlantItem {
  id: string;
  name: string;
  type_id?: number;
  description: string;
  image?: any;
  image_url?: string;
  imagePath?: string | null;
  sensorBoxId?: string;
  sensorLastSeenAt?: string;
  gradientColors?: [string, string];
}
