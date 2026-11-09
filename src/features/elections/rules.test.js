import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allocateSeats, countElection, cycleOffices, electionWeek, OFFICES, officeTerritory } from './rules.js';
import { CHILE_GEO } from '../../shared/geography.js';
import { POLICIES_CATALOG, PROGRAM_PRESETS, programPosition } from '../character/programs.js';

const ids = (year, region) => cycleOffices(year, region).map(([id]) => id);

test('ordinary election cycles and minimum ages', () => {
  assert.deepEqual(ids(2024, 'rm'), ['concejal', 'alcalde', 'core', 'gobernador']);
  assert.deepEqual(ids(2025, 'rm'), ['diputado', 'presidente']);
  assert.deepEqual(ids(2025, 'valpo'), ['diputado', 'senador', 'presidente']);
  assert.deepEqual(ids(2026, 'valpo'), []);
  assert.deepEqual(ids(2029, 'rm'), ['diputado', 'senador', 'presidente']);
  assert.deepEqual(ids(2029, 'valpo'), ['diputado', 'presidente']);
  assert.deepEqual(Object.values(OFFICES).map(office => office.age), [18, 18, 18, 18, 21, 35, 35]);
  assert.equal(electionWeek(2025), 46);
});

test('CORE uses the province and diputados use the district', () => {
  const player = { region: 'rm', commune: 'Colina', district: 'Distrito 8' };
  assert.equal(officeTerritory(OFFICES.core, player, CHILE_GEO), 'Chacabuco');
  assert.equal(officeTerritory(OFFICES.diputado, player, CHILE_GEO), 'Distrito 8');
});

test('independent lists cannot take more seats than they can fill', () => {
  const independent = { id: 'ind', votes: 9000, capacity: 1 };
  const pact = { id: 'pact', votes: 5000, capacity: 4 };
  assert.equal(allocateSeats([independent, pact], 4).length, 4);
  assert.equal(independent.seats, 1);
  assert.equal(pact.seats, 3);
});

test('executive races apply plurality or an executive runoff as appropriate', () => {
  const player = { nameRecognition: 25, approval: 52 };
  assert.equal(countElection({ office:'alcalde', support: 1600 }, player).won, true);
  assert.match(countElection({ office:'gobernador', support: 2250 }, player).summary, /Segunda vuelta simulada/);
  assert.match(countElection({ office:'presidente', support: 3000 }, player).summary, /Segunda vuelta simulada/);
});

test('presets point to three distinct, stable policies and produce finite compass coordinates', () => {
  const policyIds = new Set(POLICIES_CATALOG.map(policy => policy.id));
  assert.equal(policyIds.size, POLICIES_CATALOG.length);
  for (const preset of PROGRAM_PRESETS) {
    assert.equal(new Set(preset.ids).size, 3);
    assert.ok(preset.ids.every(id => policyIds.has(id)));
    const position = programPosition(preset.ids);
    assert.ok(Number.isFinite(position.x) && Number.isFinite(position.y));
  }
});
