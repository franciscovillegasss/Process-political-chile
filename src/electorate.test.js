import assert from 'node:assert/strict';
import { test } from 'node:test';
import { campaignClimate, decayMessages, messageImpact, newMessages, policyUrgency, publicAgenda } from './electorate.js';
import { electionField } from './election.js';

const country = {
  year: 2024, week: 17, socialTension: 42,
  macroMetrics: { inflation: 4, gdpGrowth: 2, unemployment: 8, victimizationRate: 58 },
};
const race = () => ({ year: 2024, office: 'concejal', support: 1200, messages: newMessages(), revisions: 0 });
const player = (partyId, corePolicies) => ({ partyId, corePolicies, nameRecognition: 25, approval: 52 });
const market = player('PREP', ['p28', 'p7', 'p31']);
const social = player('PS', ['p27', 'p8', 'p30']);

test('an agenda can favor social reform and later favor investment', () => {
  const investment = { ...country, week: 33 };
  assert.notEqual(publicAgenda(country).title, publicAgenda(investment).title);
  assert.ok(policyUrgency(country, 'Salud') > policyUrgency(investment, 'Salud'));
  assert.ok(campaignClimate({ ...country, player: social }).multiplier > campaignClimate({ ...country, player: market }).multiplier);
  assert.ok(campaignClimate({ ...investment, player: market }).multiplier > campaignClimate({ ...investment, player: social }).multiplier);
});

test('urgency alone cannot make opposing proposals equally attractive', () => {
  const state = { ...country, player: player('IND', ['p27', 'p28', 'p8']) };
  const [publicInsurance, privateChoice] = campaignClimate(state).policyResults;
  assert.equal(publicInsurance.urgency, privateChoice.urgency);
  assert.ok(messageImpact(publicInsurance, 60) > messageImpact(privateChoice, 60));
});

test('a credible change can improve reach, while repeated revisions carry a cost', () => {
  const original = campaignClimate({ ...country, player: market, localElection: race() });
  const state = {
    ...country, player: player('PREP', ['p26', 'p24', 'p29']),
    localElection: { ...race(), revisions: 1 },
  };
  const revised = campaignClimate(state);
  assert.ok(revised.multiplier > original.multiplier);
  state.localElection.revisions = 3;
  assert.ok(campaignClimate(state).multiplier < revised.multiplier);
});

test('emphasis saturates and decays, and public mood affects both sides of the projection', () => {
  const state = { ...country, player: market, localElection: race() };
  const normal = campaignClimate(state);
  state.localElection.messages.p28 = 4;
  const repeated = campaignClimate(state);
  assert.ok(messageImpact(repeated.policyResults[0], 60) < messageImpact(normal.policyResults[0], 60));
  decayMessages(state.localElection);
  assert.equal(state.localElection.messages.p28, 3.55);
  const field = electionField(state.localElection, market, state.week, normal);
  const neutral = electionField(state.localElection, market, state.week);
  assert.notEqual(field.votes, neutral.votes);
  assert.notEqual(field.rivals[0].votes, neutral.rivals[0].votes);
});
