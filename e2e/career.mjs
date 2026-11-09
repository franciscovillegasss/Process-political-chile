import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
let browser;
try {
  await server.listen();
  const url = server.resolvedUrls.local[0];
  browser = await chromium.launch({ channel: process.env.BETA_BROWSER_CHANNEL || undefined });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(15_000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const origin = new URL(url).origin;
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const click = selector => page.locator(selector).click();
  const invoke = (name, ...args) => page.evaluate(([key, values]) => window[key](...values), [name, args]);
  const text = id => page.locator('#' + id).textContent();
  const save = () => page.evaluate(() => {
    window.saveGameQuick();
    return JSON.parse(localStorage.getItem('tpp_chile_clean_save'));
  });
  const load = state => page.evaluate(value => {
    localStorage.setItem('tpp_chile_clean_save', JSON.stringify(value));
    window.loadGameQuick();
  }, state);

  assert.equal(await page.locator('#screen-page-2-territory').isVisible(), false);
  await page.locator('#p1-name').fill('Camila Soto');
  await click('[onclick="window.goToPage2Territory()"]');
  await page.locator('#p2-region').selectOption('rm');
  await page.locator('#p2-district').selectOption({ index: 1 });
  await page.locator('#p2-commune').selectOption({ index: 1 });
  await click('[onclick="window.finishFullCharacterCreation()"]');
  assert.equal(await page.locator('#clock-election-badge').isVisible(), true);
  const baseline = await save();
  await page.locator('#svg-contiguous-map path').first().dispatchEvent('click');
  assert.equal((await save()).campaign.focus, 0);
  assert.match(await text('map-sector-inspected'), /puerta a puerta/);
  await click('[data-view="view-politicians"]');
  const politicians = await page.locator('#politicians-table-body tr').count();
  await page.locator('#pol-filter-bloc').selectOption('Centro');
  assert.ok(await page.locator('#politicians-table-body tr').count() < politicians);
  await click('[data-view="view-congress"]');
  await click(`[onclick="window.switchSubpanel('congress', 'history', this)"]`);
  await page.locator('#hist-filter-area').selectOption('crime');
  assert.equal(await page.locator('#legislative-history-table-body tr').count(), 1);
  const go = (year, week, campaign = false) => page.evaluate(({year, week, campaign}) => {
    const time = () => document.getElementById('clock-date-disp').textContent.match(/Semana (\d+).* (\d+)$/).slice(1).map(Number);
    while (true) {
      const [nowWeek, nowYear] = time();
      if (nowYear * 52 + nowWeek >= year * 52 + week) return;
      if (campaign) {
        window.executeCampaignAction('puerta_a_puerta');
        window.manageVolunteers('deploy');
      }
      window.advanceTurn(nowYear === year || campaign ? 1 : 4);
    }
  }, {year, week, campaign});

  await go(2024, 8);
  await click('#local-register');
  await go(2024, 44);
  assert.match(await text('elections-calendar-cards'), /no electa/);
  await go(2025, 8);
  await click('#local-register');
  await go(2025, 46);
  assert.match(await text('elections-calendar-cards'), /no electa/);
  await go(2028, 8);
  assert.ok((await save()).player.politicalPoints < 10);
  await click('[onclick="window.buildPoliticalCapital()"]');
  await click('#local-register');
  await go(2028, 44, true);
  assert.match(await text('elections-calendar-cards'), /Candidatura electa/);
  await click('[data-view="view-office"]');
  await click('[onclick="window.proposeProject()"]');
  await click('[onclick="window.switchSubpanel(\'office\', \'lobby\', this)"]');
  await click('[onclick="window.holdHearing(false)"]');
  await click('[onclick="window.holdHearing(false)"]');
  await click('[onclick="window.switchSubpanel(\'office\', \'overview\', this)"]');
  await click('[onclick="window.voteProject(false)"]');
  const approved = await save();
  assert.equal(approved.mandate.budget, 10_000_000);
  assert.ok(approved.mandate.project.due > approved.year * 52 + approved.week);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await go(2028, 51);
  const completed = await save();
  assert.equal(completed.mandate.completed, 1);
  assert.equal(completed.territories[0].commune, completed.player.commune);
  assert.equal(completed.territories[0].projects.length, 1);
  assert.match(await text('territory-memory'), /Obras registradas:.*Plan comunal/);
  assert.ok(completed.player.approval > approved.player.approval);
  assert.ok(completed.career.some(entry => entry.title.includes('ejecutado')));
  await click('[data-view="view-office"]');
  if (process.env.BETA_SCREENSHOT) await page.screenshot({ path: process.env.BETA_SCREENSHOT });
  await invoke('buildPoliticalCapital');
  await go(2032, 8);
  await invoke('buildPoliticalCapital');
  assert.ok((await save()).player.approval >= baseline.player.approval);
  assert.match(await text('campaign-climate'), /gestión del mandato: ×1,025/);
  await click('#local-register');
  await go(2032, 44, true);
  assert.match(await text('elections-calendar-cards'), /Candidatura electa/);
  console.log('Derrota, recuperación sin asesores, mandato, proyecto guardado y reelección: OK');

  await invoke('setCongressChamber', 'senado');
  assert.match(await text('cong-quorum-simple-disp'), /^26/);
  assert.match(await text('cong-quorum-47-disp'), /^29/);
  const original = await save();
  const invalid = { ...original, player: { ...original.player, funds: -1, corePolicies: ['inexistente'] } };
  await load(invalid);
  assert.equal(await text('notice-title'), 'Error');
  assert.equal((await save()).player.funds, original.player.funds);
  const runoff = {
    ...baseline, week: 43,
    localElection: { year: 2024, office: 'gobernador', pact: 'ind', support: 2400, result: '' },
  };
  await load(runoff);
  await click('#btn-hdr-advance-1');
  assert.match(await text('elections-calendar-cards'), /Clasificaste a segunda vuelta/);
  const first = await save();
  assert.equal(first.localElection.runoffWeek, 48);
  assert.equal(first.localElection.runoffSnapshot.rivals.length, 4);
  await page.locator('#runoff-endorsements button:enabled').first().click();
  const endorsed = await save();
  assert.equal(endorsed.localElection.runoffEndorsements.length, 1);
  await page.reload({ waitUntil: 'domcontentloaded' });
  assert.deepEqual((await save()).localElection.runoffSnapshot, first.localElection.runoffSnapshot);
  assert.deepEqual((await save()).localElection.runoffEndorsements, endorsed.localElection.runoffEndorsements);
  await invoke('executeCampaignAction', 'puerta_a_puerta');
  assert.ok((await save()).localElection.support > first.localElection.support);
  await click('#btn-hdr-advance-4');
  assert.match(await text('elections-calendar-cards'), /se abstuvieron/);
  if (process.env.BETA_RUNOFF_SCREENSHOT) await page.screenshot({ path: process.env.BETA_RUNOFF_SCREENSHOT });
  assert.match(await text('elections-calendar-cards'), /Resultado 2024[\s\S]*Segunda vuelta/);

  for (const batch of [4, 1]) {
    await load(baseline);
    const result = await page.evaluate(step => {
      const snapshot = () => {
        window.saveGameQuick();
        return JSON.parse(localStorage.getItem('tpp_chile_clean_save'));
      };
      const time = () => document.getElementById('clock-date-disp').textContent.match(/Semana (\d+).* (\d+)$/).slice(1).map(Number);
      let turns = 0, entries = 0, checks = 0;
      while (turns < 4500) {
        const [week, year] = time();
        if (year >= 2106) break;
        if (week === 8 && year % 4 <= 1) {
          for (let count = 0; count < 3; count++) {
            if (snapshot().player.politicalPoints >= 10) break;
            window.buildPoliticalCapital();
            window.advanceTurn(4);
          }
          window.registerCandidate();
          if (snapshot().localElection?.year === year && snapshot().localElection.office) entries++;
        }
        if (step === 1 && year % 4 <= 1 && week >= 8 && week < 44) {
          window.executeCampaignAction('puerta_a_puerta');
          window.manageVolunteers('deploy');
        }
        if (week % 4 === 1) window.buildPoliticalCapital();
        if (turns % 6 === 0) window.fundraiseAction();
        window.advanceTurn(step);
        const [nextWeek, nextYear] = time();
        if (nextWeek < 1 || nextWeek > 52 || nextYear * 52 + nextWeek <= year * 52 + week) throw Error('Fecha inválida');
        if (nextYear !== year && nextYear % 10 === 0) {
          const before = snapshot();
          window.loadGameQuick(true);
          const after = snapshot();
          for (const key of ['year', 'week', 'player', 'career', 'mandate', 'roster', 'territories']) {
            if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) throw Error(`Guardado alterado: ${key}`);
          }
          checks++;
        }
        turns++;
      }
      const end = snapshot();
      return { turns, entries, checks, year: end.year, age: end.player.age, succession: end.career.some(event => event.type === 'Sucesión') };
    }, batch);
    assert.equal(result.year, 2106);
    assert.equal(result.succession, true);
    assert.equal(result.checks, 8);
    assert.ok(result.entries >= 30, JSON.stringify(result));
    console.log(`Carrera de 82 años (+${batch}): ${JSON.stringify(result)}`);
  }

  const missing = await page.evaluate(() => [...document.querySelectorAll('[onclick],[onchange],[oninput]')]
    .flatMap(element => [...element.attributes].filter(attribute => /^on(click|change|input)$/.test(attribute.name)))
    .flatMap(attribute => [...attribute.value.matchAll(/window\.(\w+)\(/g)])
    .map(match => match[1]).filter(name => typeof window[name] !== 'function'));
  assert.deepEqual(missing, []);
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  await server.close();
}
