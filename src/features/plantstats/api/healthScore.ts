export function calculateHealth(r: any): number {
  if (!r) return 0;

  const ranges = {
    temperature: { min: 18, max: 30 },
    humidity: { min: 40, max: 70 },
    soil_moisture: { min: 30, max: 70 },
    light: { min: 500, max: 20000 },
    electrical_conductivity: { min: 0.5, max: 3 },
  };

  let score = 100;
  const apply = (v: any, key: keyof typeof ranges, weight = 15) => {
    if (v == null) return;
    if (v < ranges[key].min || v > ranges[key].max) score -= weight;
  };

  apply(r.temperature, 'temperature');
  apply(r.humidity, 'humidity');
  apply(r.soil_moisture, 'soil_moisture');
  apply(r.light, 'light');
  apply(r.electrical_conductivity, 'electrical_conductivity', 20);

  return Math.max(0, Math.min(score, 100));
}
