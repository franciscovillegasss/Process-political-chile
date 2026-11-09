import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BROADCAST_MS, tallyFrame } from './broadcast-rules.js';

test('televised batches reveal a monotonic count and match the engine result at one minute', () => {
  const candidates = [{ name: 'A', votes: 501 }, { name: 'B', votes: 499 }];
  assert.equal(tallyFrame(candidates, 0).total, 0);
  assert.ok(tallyFrame(candidates, 45_000).total > tallyFrame(candidates, 15_000).total);
  assert.ok(tallyFrame(candidates, 59_999).progress < 1);
  const final = tallyFrame(candidates, BROADCAST_MS);
  assert.equal(final.total, 1000);
  assert.equal(final.progress, 1);
  assert.equal(final.rows[0].share, 0.501);
});
