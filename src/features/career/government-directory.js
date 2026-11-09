import { newRoster } from './rules.js';

const seed = label => [...label].reduce((value, char) => (value * 31 + char.codePointAt(0)) % 997, 0);

export function governmentDirectory(state, commune, councilSeats) {
  const presidency = 2026 + Math.floor((state.year - 2026) / 4) * 4;
  const municipal = 2024 + Math.floor((state.year - 2024) / 4) * 4;
  const national = newRoster(presidency);
  const municipalRoster = newRoster(municipal);
  const nationalAt = index => national[(index + (presidency - 2022) / 4 % 12 + 12) % 12];
  const localAt = index => municipalRoster[(index + seed(commune + municipal)) % municipalRoster.length];
  const { player } = state;
  const results = state.governmentResults ?? [];
  const resultAt = (office, territory) => results.find(result =>
    result.office === office && result.territory === territory && result.year <= state.year && state.year - result.year < 4);
  const nationalPresident = player.officeId === 'presidente' ? player : resultAt('presidente', 'Chile') ?? nationalAt(0);
  const mayor = player.officeId === 'alcalde' && player.commune === commune ? player : resultAt('alcalde', commune) ?? localAt(0);
  const describe = (title, person) => ({ title, name: person.name, party: person.partyId || person.party });
  return {
    national: [
      describe('Presidencia', nationalPresident), describe('Ministerio del Interior', nationalAt(2)),
      describe('Ministerio de Hacienda', nationalAt(4)), describe('Secretaría General de la Presidencia', nationalAt(6)),
    ],
    local: [
      describe('Alcaldía', mayor),
      ...Array.from({ length: councilSeats }, (_, index) => describe(`Concejo · escaño ${index + 1}`,
        index === 0 && player.officeId === 'concejal' && player.commune === commune ? player : localAt(index + 1))),
    ],
  };
}
