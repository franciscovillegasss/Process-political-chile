import assert from 'node:assert/strict';
import { test } from 'node:test';
import { campaignPayment, grantCampaignWeek } from './funding.js';

test('weekly campaign grants are idempotent and stop at the result', () => {
  const election = { office: 'concejal' };
  assert.equal(grantCampaignWeek(election, 8), 350_000);
  assert.equal(grantCampaignWeek(election, 8), 0);
  assert.equal(grantCampaignWeek(election, 9), 350_000);
  election.result = 'Cerrado';
  assert.equal(grantCampaignWeek(election, 10), 0);
  assert.equal(election.campaignFunds, 700_000);
});

test('eligible spending uses the restricted balance first and a rejection debits nothing', () => {
  const election = { campaignFunds: 350_000 };
  const costs = { hours: 6, funds: 550_000 };
  assert.equal(campaignPayment(election, costs, () => false), false);
  assert.equal(election.campaignFunds, 350_000);
  assert.equal(campaignPayment(election, costs, amount => {
    assert.deepEqual(amount, { hours: 6, funds: 200_000 });
    return true;
  }), true);
  assert.equal(election.campaignFunds, 0);
});
