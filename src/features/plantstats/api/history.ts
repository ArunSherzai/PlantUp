export function calculateAverages(data: any[]) {
  if (!data.length) return null;

  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  return {
    temperature: avg(data.map((d) => d.temperature ?? 0)),
    soil_moisture: avg(data.map((d) => d.soil_moisture ?? 0)),
    ec: avg(data.map((d) => d.electrical_conductivity ?? 0)),
    light: avg(data.map((d) => d.light ?? 0)),
  };
}

export function lastXdays(controllerRows: any[], days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return controllerRows.filter((p) => new Date(p.created_at).getTime() >= cutoff);
}
