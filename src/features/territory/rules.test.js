import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialState } from '../../app/state.js';
import { completeProject } from '../career/rules.js';
import { campaignClimate } from '../electorate/rules.js';
import { localContactDiscount, localProfile, recordLocalContact, recordMobilization } from './rules.js';

test('a municipal project affects only its commune and survives the end of the mandate', () => {
  const state = initialState();
  state.player.officeId = 'concejal';
  state.mandate = { completed: 0, project: { name: 'Plan de salud', issue: 'Salud', due: 0 } };
  const healthNeed = () => localProfile(state).needs.find(item => item.issue === 'Salud').need;
  const initialNeed = healthNeed();
  assert.equal(completeProject(state), false);
  state.mandate.project.due = state.year * 52 + state.week;
  assert.equal(completeProject(state), true);
  state.mandate = null;
  assert.ok(healthNeed() < initialNeed);
  assert.ok(campaignClimate(state).localBoost > 1);
  state.player.commune = 'Pudahuel';
  assert.equal(localProfile(state).projects.length, 0);
  assert.equal(campaignClimate(state).localBoost, 1);
  state.player.commune = 'Maipú';
  state.year += 7;
  assert.equal(healthNeed(), initialNeed);
  assert.equal(localProfile(state).projects.length, 1);
});

test('mobilization and contacts persist locally and fade over time', () => {
  const state = initialState();
  recordLocalContact(state, 'vecinos');
  recordMobilization(state, 40);
  assert.equal(localContactDiscount(state, 'vecinos'), 1);
  assert.equal(localProfile(state).participation, 2);
  state.year += 9;
  assert.equal(localContactDiscount(state, 'vecinos'), 0);
  assert.equal(localProfile(state).participation, 0);
});
