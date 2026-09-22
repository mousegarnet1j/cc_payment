export function formatNumber(number?: number) {
  const value = Number.isFinite(Number(number)) ? Number(number) : 0;
  return value.toLocaleString('es-ES');
}
