import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { assembleHtml } from './page-fragments.js';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const html = assembleHtml(read('../index.html'));

test('the assembled page has unique IDs and resolves navigation destinations', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const match of html.matchAll(/\bdata-view="([^"]+)"/g)) {
    assert.ok(ids.includes(match[1]), `Missing view: ${match[1]}`);
  }
  for (const [, view, panel] of html.matchAll(/window\.switchSubpanel\('([^']+)', '([^']+)'/g)) {
    assert.ok(ids.includes(`${view}-panel-${panel}`), `Missing subpanel: ${view}/${panel}`);
  }
});

test('inline controls are registered by the browser entry point', () => {
  const [registry] = read('../src/main.js').match(/Object\.assign\(window, \{[\s\S]+?\}\);/) ?? [];
  assert.ok(registry);
  for (const [, name] of html.matchAll(/\bon(?:click|input|change)="window\.(\w+)\(/g)) {
    assert.match(registry, new RegExp(`\\b${name}\\b`), `Missing handler: ${name}`);
  }
});
