import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BACKUP_KEY, SAVE_KEY, lastIntactCopy, writeManualSave } from './journal.js';
import { decodeSave } from './codec.js';

test('a failed manual write preserves the preceding valid save and a recovery copy', () => {
  const values = new Map([[SAVE_KEY, '{"turn":4}']]);
  const storage = { getItem: key => values.get(key), setItem(key, value) {
    if (key === SAVE_KEY) throw new Error('Quota');
    values.set(key, value);
  }};
  assert.throws(() => writeManualSave(storage, '{"turn":5}', JSON.parse), /Quota/);
  assert.equal(storage.getItem(SAVE_KEY), '{"turn":4}');
  assert.equal(storage.getItem(BACKUP_KEY), '{"turn":4}');
  assert.equal(lastIntactCopy(storage, JSON.parse), '{"turn":4}');
});

test('legacy data is normalized and an unknown future schema is rejected', () => {
  const raw = { year: 2024, week: 1, player: { name: 'Camila' } };
  assert.equal(decodeSave(JSON.stringify(raw)).schemaVersion, 1);
  assert.throws(() => decodeSave(JSON.stringify({ ...raw, schemaVersion: 99 })), /Versión/);
  assert.throws(() => decodeSave(JSON.stringify({ ...raw, profile: 'rm-reference', player: { ...raw.player, region: 'valpo' } })), /Perfil/);
});
