export function calculateAverages(data: any[]) {
  if (!data.length) return null;

  const avg = (arr: any[]) => {
    const safe = arr
      .map((value) => (typeof value === 'number' ? value : value != null ? Number(value) : NaN))
      .filter((value) => Number.isFinite(value));

    return safe.length ? safe.reduce((a, b) => a + b, 0) / safe.length : null;
  };

  return {
    temperature: avg(data.map((d) => d.temperature)),
    humidity: avg(data.map((d) => d.humidity)),
    soil_moisture: avg(data.map((d) => d.soil_moisture)),
    electrical_conductivity: avg(data.map((d) => d.electrical_conductivity)),
    light: avg(data.map((d) => d.light)),
  };
}

export function lastXdays(controllerRows: any[], days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return controllerRows.filter((p) => {
    const timestamp = p.time ?? p.created_at;
    const date = new Date(timestamp);
    return Number.isFinite(date.getTime()) && date.getTime() >= cutoff;
  });
}
