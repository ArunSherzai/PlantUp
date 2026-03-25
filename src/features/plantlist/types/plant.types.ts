export interface PlantItem {
  id: string;
  name: string;
  type_id?: number;
  description: string;
  image?: any;
  image_url?: string;
  sensorBoxId?: string;
  sensorLastSeenAt?: string;
  gradientColors?: [string, string];
}
