import assert from 'node:assert/strict';
import { test } from 'node:test';
import { initialState } from '../../app/state.js';
import { POLICIES_CATALOG } from '../character/programs.js';
import { decodeSave } from '../save/codec.js';
import { completeProject, giveUpOffice, openMandate } from './rules.js';
import { availablePublicBudget, advancePublicBudget, enactGovernmentProject, fundService, governmentVote, INSTITUTIONS,
  isBicameral, newGovernmentProject, projectTerms, voteSignature } from './governance-rules.js';
import { improveService, serviceCoverage } from './public-services.js';
import { promiseReputation, updatePromises } from './promises.js';

function officeState(office = 'diputado') {
  const state = initialState();
  state.player.officeId = office;
  state.player.age = 45;
  openMandate(state);
  return state;
}

test('all seven offices require support, preserve rejected funds and record their own legislative route', () => {
  for (const office of Object.keys(INSTITUTIONS)) {
    const state = officeState(office);
    const project = newGovernmentProject(state, POLICIES_CATALOG[0]);
    state.mandate.project = project;
    assert.equal(governmentVote(state, project).approved, false, office);
    assert.equal(state.mandate.budget, 12_000_000);
    project.agreements.push('ofic');
    let vote = governmentVote(state, project);
    assert.equal(vote.approved, true, office);
    project.approvals.push(vote.body);
    if (isBicameral(office)) {
      project.status = 'review';
      const firstBody = vote.body;
      vote = governmentVote(state, project);
      assert.notEqual(vote.body, firstBody);
      assert.equal(vote.approved, true);
      project.approvals.push(vote.body);
    }
    project.status = 'authorized';
    assert.deepEqual(decodeSave(JSON.stringify(state)), state);
    const cost = projectTerms(project).cost;
    assert.equal(enactGovernmentProject(state, state.year * 52 + state.week), true);
    assert.equal(state.mandate.budget, 12_000_000 - cost);
    assert.equal(enactGovernmentProject(state, state.year * 52 + state.week), false);
    state.week += projectTerms(project).weeks;
    assert.equal(completeProject(state), true);
    assert.equal(completeProject(state), false);
    assert.equal(state.promises[0].status, 'fulfilled');
    assert.ok(state.mandate.maintenance > 0);
    assert.deepEqual(decodeSave(JSON.stringify(state)), state);
  }
});

test('composition and concessions affect approval, cost, duration and the ability to repeat a vote', () => {
  const state = officeState();
  const project = newGovernmentProject(state, POLICIES_CATALOG[0]);
  const before = voteSignature(state, project);
  state.congress.lower = { ofic: 0, cv: 0, rep: 100, cent: 0 };
  assert.equal(governmentVote(state, project).approved, true);
  assert.notEqual(voteSignature(state, project), before);
  const terms = projectTerms(project);
  project.agreements.push('ofic');
  assert.ok(projectTerms(project).cost > terms.cost);
  assert.ok(projectTerms(project).weeks > terms.weeks);
  assert.ok(projectTerms(project).impact < terms.impact);
  const funded = voteSignature(state, project);
  state.mandate.budget = 0;
  assert.equal(governmentVote(state, project).approved, false);
  assert.notEqual(voteSignature(state, project), funded);
});

test('public service funding is prepaid, local, idempotent and exhausts after three deliveries', () => {
  const state = officeState('alcalde');
  const privateFunds = state.player.funds;
  assert.equal(fundService(state, 'Salud'), true);
  assert.equal(fundService(state, 'Salud'), false);
  assert.equal(state.mandate.budget, 11_000_000);
  for (const week of [5, 9, 13]) {
    state.week = week;
    advancePublicBudget(state);
    const prior = JSON.stringify(state);
    advancePublicBudget(state);
    assert.equal(JSON.stringify(state), prior);
  }
  assert.equal(serviceCoverage(state, 'Salud'), 6);
  assert.equal(state.mandate.programs.length, 0);
  assert.equal(state.player.funds, privateFunds);
  state.player.commune = 'Pudahuel';
  assert.equal(serviceCoverage(state, 'Salud'), 0);
});

test('annual appropriations respect the ceiling and maintenance never creates negative balances', () => {
  const state = officeState('presidente');
  state.mandate.budget = 8_000_000;
  state.year++;
  advancePublicBudget(state);
  assert.equal(state.mandate.budget, 12_000_000);
  state.week = 13;
  state.mandate.budget = 0;
  state.mandate.maintenance = 100_000;
  advancePublicBudget(state);
  assert.equal(state.mandate.budget, 0);
  assert.equal(state.player.approval, 50.5);
});

test('national services affect macro indicators and regional services retain their territorial scope', () => {
  const state = officeState('gobernador');
  const before = state.macroMetrics.unemployment;
  improveService(state, 'Trabajo y transporte', 8);
  assert.equal(state.macroMetrics.unemployment, before);
  assert.equal(serviceCoverage(state, 'Trabajo y transporte'), 8);
  state.player.region = 'valpo';
  assert.equal(serviceCoverage(state, 'Trabajo y transporte'), 0);
  state.player.officeId = 'presidente';
  improveService(state, 'Trabajo y transporte', 8);
  assert.ok(state.macroMetrics.unemployment < before);
});

test('promise fulfillment survives the mandate and blocked promises differ from abandoned ones', () => {
  const state = officeState();
  const project = newGovernmentProject(state, POLICIES_CATALOG[0]);
  updatePromises(state, project, 'fulfilled');
  state.promises[1].status = 'blocked';
  assert.equal(promiseReputation(state), 1.03);
  giveUpOffice(state);
  assert.deepEqual(state.promises.map(promise => promise.status), ['fulfilled', 'blocked-final', 'unfulfilled']);
  assert.equal(promiseReputation(state), 1.01);
  assert.deepEqual(decodeSave(JSON.stringify(state)), state);
});

test('new public state rejects invalid allocations and incomplete legislative authorizations', () => {
  const state = officeState();
  state.mandate.project = newGovernmentProject(state, POLICIES_CATALOG[0]);
  state.mandate.project.status = 'authorized';
  assert.throws(() => decodeSave(JSON.stringify(state)), /Tramitación pública/);
  state.mandate.project = null;
  state.mandate.programs = [{ issue: 'Salud', started: state.year * 52, until: 1, lastPayment: 0 }];
  assert.throws(() => decodeSave(JSON.stringify(state)), /Programas públicos/);
});


test('an authorized project reserves its funds before temporary service allocations', () => {
  const state = officeState('presidente');
  const project = newGovernmentProject(state, POLICIES_CATALOG[0]);
  state.mandate.project = project;
  project.status = 'authorized';
  state.mandate.budget = projectTerms(project).cost + 500_000;
  assert.equal(availablePublicBudget(state), 500_000);
  assert.equal(fundService(state, 'Salud'), false);
  assert.equal(state.mandate.budget, projectTerms(project).cost + 500_000);
});
