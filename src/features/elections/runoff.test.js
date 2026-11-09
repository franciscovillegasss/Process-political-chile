import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transferRunoff } from './runoff.js';

const snapshot = {
  votes: 1900,
  rivals: [{ slot: 0, votes: 2100 }, { slot: 3, votes: 1403 }, { slot: 6, votes: 711 }, { slot: 9, votes: 1099 }],
};

test('each eliminated bloc transfers all of its ballots exactly once', () => {
  const rows = transferRunoff(snapshot, 0, [0.8, 0.25]);
  assert.equal(rows.length, 3);
  for (const row of rows) {
    assert.equal(row.player + row.rival + row.abstained, snapshot.rivals.find(rival => rival.slot === row.slot).votes);
    assert.ok(row.abstained > 0);
  }
});

test('affinity and an explicit endorsement move votes toward the player', () => {
  const lowAffinity = transferRunoff(snapshot, 0, [-1.8, -1]).find(row => row.slot === 3);
  const aligned = transferRunoff(snapshot, 0, [1, 0.65]).find(row => row.slot === 3);
  const endorsed = transferRunoff(snapshot, 0, [1, 0.65], [3]).find(row => row.slot === 3);
  assert.ok(aligned.player > lowAffinity.player);
  assert.ok(endorsed.player > aligned.player);
  assert.ok(endorsed.abstained < aligned.abstained);
});
