export function tieOrder(id, seed) {
  let value = seed >>> 0;
  for (const char of String(id)) value = Math.imul(value ^ char.codePointAt(0), 16777619) >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 2246822507) >>> 0;
  return value >>> 0;
}
