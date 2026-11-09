import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialCampaign, weeklyCampaign } from '../campaign/rules.js';
import { completeProject, fundraisingYield, giveUpOffice, newRoster, openMandate, renewRoster } from './rules.js';
import { countElection, electionField } from '../elections/rules.js';

test('a project resolves once on its due week and remains in the career record', () => {
  const state = {
    year: 2024, week: 20, player: { name: 'Camila Soto', approval: 52, politicalPoints: 1 },
    career: [], newsFeed: [],
  };
  openMandate(state);
  state.mandate.project = { name: 'Plan comunal de salud', issue: 'Salud', due: 2024 * 52 + 23, relevant: true };
  assert.equal(completeProject(state), false);
  state.week = 23;
  assert.equal(completeProject(state), true);
  assert.equal(completeProject(state), false);
  assert.equal(state.player.approval, 57);
  assert.equal(state.mandate.completed, 1);
  assert.equal(state.career.length, 1);
  giveUpOffice(state);
  assert.equal(state.mandate, null);
  assert.equal(state.career.length, 1);
});

test('donor fatigue reduces repetitive income and recovers when events stop', () => {
  const state = { player: { approval: 52 }, campaign: initialCampaign(), week: 9 };
  const fresh = fundraisingYield(state);
  state.campaign.donorFatigue = 8;
  assert.ok(fundraisingYield(state) < fresh / 2);
  weeklyCampaign(state);
  assert.equal(state.campaign.donorFatigue, 7);
  state.campaign.fundraising = 1;
  assert.ok(fundraisingYield(state) < fresh);
  weeklyCampaign(state);
  assert.equal(state.campaign.donorFatigue, 7);
});

test('the directory renews retiring rivals and elections use the successor', () => {
  const state = { year: 2024, roster: newRoster(2024) };
  const old = state.roster[0];
  state.year += 41;
  renewRoster(state);
  const successor = state.roster[0];
  assert.notEqual(successor.name, old.name);
  assert.equal(successor.generation, 2);
  const field = electionField({ office: 'alcalde', support: 1200 }, { nameRecognition: 25, approval: 52 }, 8, undefined, state.roster);
  assert.equal(field.rivals.find(rival => rival.slot === 0).name, successor.name);
});

test('executive runoffs stage a new vote against just the qualifying rival', () => {
  const election = { office: 'gobernador', support: 2250 };
  const player = { nameRecognition: 25, approval: 52 };
  const first = countElection(election, player, undefined, 8, undefined, undefined, true);
  assert.equal(first.runoff, 0);
  const next = { ...election, runoffWeek: 48, runoffRival: first.runoff };
  assert.equal(electionField(next, player, 48).rivals.length, 1);
  assert.match(countElection(next, player, undefined, 48).summary, /Segunda vuelta/);
});
