import assert from 'node:assert/strict';
import { test } from 'node:test';
import { councilDecision, executeCouncilAgreement } from './municipal.js';

test('the council can reject a project, and a concession trades budget and time for votes', () => {
  const project = { municipalId: 'lighting', concessions: [] };
  assert.equal(councilDecision(project, 10, 12_000_000).approved, false);
  project.concessions.push('vecinal');
  const vote = councilDecision(project, 10, 12_000_000);
  assert.equal(vote.approved, true);
  assert.equal(vote.cost, 5_500_000);
  assert.equal(vote.weeks, 9);
  assert.equal(councilDecision(project, 10, vote.cost - 1).approved, false);
});

test('an authorized project commits funds once during the executive phase', () => {
  const mandate = { budget: 12_000_000, project: { name: 'Luminarias', municipalId: 'lighting', status: 'proposal', concessions: ['vecinal'], lastVote: 1 } };
  const state = { mandate, profile: 'rm-reference', player: { officeId: 'concejal', commune: 'Maipú' } };
  const records = [];
  const record = (...args) => records.push(args);
  assert.equal(executeCouncilAgreement(state, 100, record), false);
  mandate.project.status = 'authorized';
  assert.equal(executeCouncilAgreement(state, 100, record), true);
  assert.equal(executeCouncilAgreement(state, 100, record), false);
  assert.equal(mandate.project.due, 109);
  assert.equal(mandate.budget, 6_500_000);
  assert.equal(records.length, 1);
  mandate.project.status = 'authorized';
  mandate.project.concessions = [];
  mandate.project.lastVote = 0;
  assert.equal(executeCouncilAgreement(state, 110, record), false);
  assert.equal(mandate.budget, 6_500_000);
});
