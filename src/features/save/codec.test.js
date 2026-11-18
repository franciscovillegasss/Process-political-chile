import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialState } from '../../app/state.js';
import { decodeSave } from './codec.js';

const load = value => decodeSave(JSON.stringify(value));

test('a current save round-trips with a pending mandate project', () => {
  const state = initialState();
  state.player.officeId = 'concejal';
  state.mandate = {
    budget: 10_000_000, completed: 0, hearings: 2,
    project: { name: 'Plan comunal', issue: 'Salud', due: state.year * 52 + 10, relevant: true },
  };
  assert.deepEqual(load(state), state);
});

test('a legacy save receives a roster and a mandate when its holder already has a title', () => {
  const state = load({ year: 2030, week: 3, player: { name: 'Camila Soto', currentOffice: 'Concejal de Maipú' } });
  assert.equal(state.roster.length, 12);
  assert.equal(state.player.officeId, 'concejal');
  assert.equal(state.mandate.budget, 12_000_000);
});

test('invalid funds, policy IDs and second-round dates are rejected', () => {
  const state = initialState();
  assert.throws(() => load({ ...state, player: { ...state.player, funds: -1 } }), /Perfil inválido/);
  assert.throws(() => load({ ...state, player: { ...state.player, corePolicies: ['inexistente'] } }), /Perfil inválido/);
  assert.throws(() => load({
    ...state, week: 44, localElection: { year: state.year, office: 'gobernador', runoffWeek: 49 },
  }), /Segunda vuelta inválida/);
});


test('an older active mandate receives scoped commitments without replacing its in-flight project', () => {
  const state = initialState();
  state.player.officeId = 'concejal';
  state.mandate = { budget: 10_000_000, completed: 0, hearings: 2,
    project: { name: 'Plan comunal', issue: 'Salud', due: state.year * 52 + 10, relevant: true } };
  delete state.promises;
  delete state.publicServices;
  const loaded = load(state);
  assert.equal(loaded.promises.length, 3);
  assert.match(loaded.promises[0].objective, /Maipú/);
  assert.deepEqual(loaded.mandate.project, state.mandate.project);
  assert.equal(loaded.mandate.budget, state.mandate.budget);
});
