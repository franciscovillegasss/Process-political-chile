import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countElection, electionField, allocateSeats } from './rules.js';
import { resolveProportionalBallot } from './ballot.js';

test('a tied executive count resolves reproducibly without changing counted ballots', () => {
  const election = { office: 'alcalde', profile: 'rm-reference', support: 1730 };
  const player = { nameRecognition: 0, approval: 52 };
  assert.equal(countElection(election, player, 0, 44).pending, true);
  const field = electionField(election, player, 44);
  election.countedVotes = { player: field.votes, rivals: field.rivals.map(({slot, votes}) => ({slot, votes})) };
  election.resolutionSeed = 321;
  const result = countElection(election, player, 0, 44);
  assert.equal(typeof result.won, 'boolean');
  assert.equal(result.pending, undefined);
  assert.deepEqual(countElection(election, { nameRecognition: 100, approval: 100 }, 0, 44), result);
  assert.equal(electionField(election, player, 44).total, field.total);
});

test('a decisive proportional tie has one stable winner after a recorded tiebreak', () => {
  const ballot = () => [{ id: 'one', votes: 100, candidates: [{id: 'a', votes: 100}] },
    { id: 'two', votes: 100, candidates: [{id: 'b', votes: 100}] }];
  assert.equal(resolveProportionalBallot(ballot(), 1, [], allocateSeats).pending, true);
  const result = resolveProportionalBallot(ballot(), 1, [], allocateSeats, 500);
  assert.equal(result.pending, false);
  assert.equal(result.elected.length, 1);
  assert.deepEqual(resolveProportionalBallot(ballot(), 1, [], allocateSeats, 500), result);
});
