import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CHILE_GEO } from '../../shared/geography.js';
import { allocateSeats, countElection } from './rules.js';
import { resolveProportionalBallot } from './ballot.js';
import { RM_COMMUNES, RM_PROFILE } from './rm-profile.js';

test('RM data covers each commune once and reconciles with the reference seat totals', () => {
  const districts = Object.values(CHILE_GEO.rm.districts);
  const communes = districts.flatMap(district => district.communes);
  assert.equal(new Set(communes).size, 52);
  assert.deepEqual([...communes].sort(), Object.keys(RM_COMMUNES).sort());
  assert.equal(districts.reduce((sum, district) => sum + district.seats, 0), 47);
  assert.equal(Object.values(RM_COMMUNES).reduce((sum, entry) => sum + entry.councilSeats, 0), 410);
  const core = new Map(Object.values(RM_COMMUNES).map(entry => [entry.constituency, entry.coreSeats]));
  assert.equal(core.size, 11);
  assert.equal([...core.values()].reduce((sum, value) => sum + value), 34);
});

test('D1 distributes seats to lists and then to the correct parties and individuals', () => {
  const person = (id, party, votes) => ({ id, party, votes });
  const list = (id, votes, candidates) => ({ id, votes, capacity: candidates.length, candidates });
  const ballot = [
    list('A', 1010, [person('X1','X',400), person('X2','X',250), person('Y1','Y',240), person('Y2','Y',120)]),
    list('B', 620, [person('B1','B',620)]),
    list('C', 410, [person('C1','C',410)]),
    list('IND', 100, [person('I1','IND',100)]),
  ];
  const result = resolveProportionalBallot(ballot, 5, ['party'], allocateSeats);
  assert.deepEqual(result.elected, ['X1','X2','Y1','B1','C1']);
  assert.deepEqual(ballot.map(entry => entry.seats), [3,1,1,0]);
});

test('a decisive tied quotient or zero valid votes requires resolution', () => {
  const lists = ['A','B'].map(id => ({ id, votes: 100, capacity: 1, candidates: [{ id, votes: 100 }] }));
  assert.equal(resolveProportionalBallot(lists, 1, [], allocateSeats).pending, true);
  assert.deepEqual(resolveProportionalBallot([{ id: 'A', votes: 0, candidates: [] }], 1, [], allocateSeats).elected, []);
});

test('governor G1 elects at 40 percent and G2 stages a runoff at 39.99 percent', () => {
  const player = { approval: 52, nameRecognition: 0 };
  const vote = own => countElection({ office: 'gobernador', profile: RM_PROFILE, support: own - 80 }, player, undefined, 8, {
    rivalFactors: [(7500-own)/(980*2.4), 2500/(720*2.4), 0, 0],
  }, undefined, true);
  assert.equal(vote(4000).won, true);
  assert.equal(vote(3999).runoff, 0);
  assert.match(vote(3999).summary, /39\.99 %/);
});
