import assert from 'node:assert/strict';
import { test } from 'node:test';
import { samplePoll } from './polling.js';
import { volunteerImpact } from './rules.js';

test('poll uncertainty depends on paid sample size and improves with specialist staff', () => {
  const field = { votes: 400, total: 1000, rivals: [{ name: 'Rival', votes: 600 }] };
  const small = samplePoll(field, 'quick', 0, () => 0.5);
  const large = samplePoll(field, 'detailed', 0, () => 0.5);
  assert.equal(small.share, 40);
  assert.equal(small.share + small.rivalShare, 100);
  assert.ok(large.margin < small.margin);
  assert.ok(samplePoll(field, 'quick', 0.3, () => 0.5).margin < small.margin);
  assert.notEqual(samplePoll(field, 'standard', 0, () => 0.7).share, small.share);
});

test('larger brigades continue helping beyond forty and trained volunteers improve mobilization', () => {
  assert.equal(volunteerImpact(0, 0), 0);
  assert.ok(volunteerImpact(500, 0) > volunteerImpact(120, 0));
  assert.ok(volunteerImpact(120, 120) > volunteerImpact(120, 0));
  assert.ok(volunteerImpact(500, 500) < volunteerImpact(40, 40) * 12.5);
});
