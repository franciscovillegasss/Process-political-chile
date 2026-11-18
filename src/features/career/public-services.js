import { CHILE_GEO } from '../../shared/geography.js';

export const SERVICE_ISSUES = ['Seguridad', 'Salud', 'Educación', 'Vivienda y ciudad', 'Medioambiente',
  'Trabajo y transporte', 'Economía', 'Instituciones y derechos', 'Pensiones'];
export const SERVICE_COST = 1_000_000;
export const SERVICE_WEEKS = 12;

export function serviceTerritory(state) {
  const { player } = state;
  if (player.officeId === 'presidente') return 'Chile';
  if (['diputado', 'senador'].includes(player.officeId)) return 'Chile';
  if (['core', 'gobernador'].includes(player.officeId)) return player.region;
  return player.commune;
}

export function serviceCoverage(state, issue) {
  const territories = [state.player.commune, state.player.region, 'Chile'];
  return Math.min(30, (state.publicServices ?? []).filter(record =>
    record.issue === issue && territories.includes(record.territory)).reduce((sum, record) => sum + record.improvement, 0));
}

export function improveService(state, issue, amount, territory = serviceTerritory(state)) {
  const records = state.publicServices ??= [];
  let record = records.find(item => item.issue === issue && item.territory === territory);
  if (!record) {
    record = { territory, issue, improvement: 0 };
    records.push(record);
  }
  const change = Math.min(amount, 30 - record.improvement);
  record.improvement += change;
  if (territory !== 'Chile' || !state.macroMetrics) return change;
  const macro = state.macroMetrics;
  if (issue === 'Seguridad') macro.victimizationRate = Math.max(0, macro.victimizationRate - change * 0.12);
  if (issue === 'Trabajo y transporte') macro.unemployment = Math.max(3, macro.unemployment - change * 0.04);
  if (issue === 'Economía') macro.gdpGrowth = Math.min(8, macro.gdpGrowth + change * 0.04);
  return change;
}

export function knownServiceTerritories() {
  return new Set(['Chile', ...Object.keys(CHILE_GEO), ...Object.values(CHILE_GEO).flatMap(region =>
    Object.values(region.districts).flatMap(district => district.communes))]);
}
