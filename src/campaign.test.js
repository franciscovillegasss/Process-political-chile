import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialCampaign, issueDemand, weeklyCampaign } from './campaign.js';
import { countElection, electionField } from './election.js';

test('campaign activities reset each week without clearing contacts, polls or training', () => {
  const campaign = initialCampaign();
  Object.assign(campaign, { digital: 1, palomas: 1, fundraising: 2, trained: 25, mobilized: 40, policyWeek: 1 });
  campaign.contacts.vecinos = 1;
  campaign.polls.push({ week: 8 });
  weeklyCampaign({ campaign, week: 9 });
  assert.deepEqual([campaign.digital, campaign.palomas, campaign.fundraising, campaign.mobilized, campaign.policyWeek], [0, 0, 0, 0, 0]);
  assert.equal(campaign.trained, 25);
  assert.equal(campaign.contacts.vecinos, 1);
  assert.equal(campaign.polls.length, 1);
});

test('monthly economic changes update trends and campaign demands', () => {
  const state = {
    campaign: initialCampaign(), week: 4, year: 2024, socialTension: 35,
    macroMetrics: { inflation: 3.8, gdpGrowth: 2.3, unemployment: 8.5, victimizationRate: 58 },
  };
  const baseline = { ...state.macroMetrics };
  weeklyCampaign(state);
  assert.notDeepEqual(state.macroMetrics, baseline);
  assert.equal(state.macroTrend.inflation, Math.round((state.macroMetrics.inflation - baseline.inflation) * 10) / 10);
  assert.equal(issueDemand(state, 'Seguridad'), true);
  const monthly = state.macroMetrics;
  state.week++;
  weeklyCampaign(state);
  assert.equal(state.macroMetrics, monthly);
});

test('the opposition shown in projections is the same field counted on election night', () => {
  const race = { office: 'alcalde', pact: 'ind', support: 1600 };
  const player = { nameRecognition: 25, approval: 52 };
  const early = electionField(race, player, 8);
  const late = electionField(race, player, 44);
  assert.equal(early.rivals.length, 4);
  assert.equal(early.rivals[0].name, late.rivals[0].name);
  assert.ok(late.rivals[0].votes > early.rivals[0].votes);
  assert.equal(countElection(race, player, undefined, 8).won, true);
  assert.equal(countElection(race, player, undefined, 44).won, false);
});
