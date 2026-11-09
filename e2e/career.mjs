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
  assert.match(await page.locator('#screen-page-1-identity details').textContent(), /puntos políticos/);
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
  assert.match(await text('directory-government'), /Presidencia/);
  const localDirectory = await text('directory-local');
  await page.locator('#directory-commune').selectOption('Pudahuel');
  assert.match(await text('directory-local-title'), /Pudahuel/);
  assert.notEqual(await text('directory-local'), localDirectory);
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
  const startingCampaign = await save();
  assert.equal(startingCampaign.localElection.campaignFunds, 350_000);
  await click('[data-view="view-campaign"]');
  await click(`[onclick="window.switchSubpanel('campaign', 'marketing', this)"]`);
  await click('#marketing-policy');
  const advertised = await save();
  assert.equal(advertised.localElection.campaignFunds, 0);
  assert.equal(advertised.player.funds, startingCampaign.player.funds - 200_000);
  assert.ok(advertised.player.nameRecognition > startingCampaign.player.nameRecognition);
  await click(`[onclick="window.switchSubpanel('campaign', 'policies', this)"]`);
  await page.locator('#policy-revision summary').click();
  await page.locator('#revision-current').selectOption('p9');
  await page.locator('#revision-new').selectOption('p20');
  await click('#revision-apply');
  const revised = await save();
  assert.ok(revised.player.corePolicies.includes('p20'));
  assert.equal(revised.localElection.revisions, 0);
  assert.equal(revised.player.politicalPoints, advertised.player.politicalPoints);
  await go(2024, 9);
  assert.equal((await save()).localElection.campaignFunds, 350_000);

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
  await page.clock.install();
  await click('#btn-hdr-advance-1');
  assert.equal(await page.locator('#election-tv').isVisible(), true);
  assert.equal(await text('tv-result'), '');
  await page.clock.fastForward(30_000);
  assert.match(await text('tv-status'), /escrutado/);
  assert.equal(await text('tv-result'), '');
  if (process.env.BETA_TV_SCREENSHOT) await page.screenshot({ path: process.env.BETA_TV_SCREENSHOT });
  await page.clock.fastForward(31_000);
  assert.match(await text('tv-result'), /Clasificaste a segunda vuelta/);
  await click('#tv-finish');
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
  assert.equal(await page.locator('#election-tv').isVisible(), true);
  await click('#tv-finish');
  assert.match(await text('tv-result'), /se abstuvieron/);
  await click('#tv-finish');
  assert.equal((await save()).localElection.campaignFunds, 0);
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

  await invoke('openNewGameWizard');
  await page.locator('#p1-name').fill('Inés RM');
  const parties = page.locator('#p1-parties-grid button');
  await parties.first().focus();
  await page.keyboard.press('Enter');
  assert.equal(await parties.first().getAttribute('aria-pressed'), 'true');
  await click('[onclick="window.goToPage2Territory()"]');
  await page.locator('#p2-game-profile').selectOption('rm-reference');
  assert.equal(await page.locator('#p2-region option[value="valpo"]').count(), 0);
  assert.equal(await page.locator('#p2-initial-office option[value="presidente"]').count(), 0);
  await page.locator('#p2-region').selectOption('rm');
  await page.locator('#p2-district').selectOption('Distrito 14');
  assert.equal(await page.locator('#p2-commune option[value="Alhué"]').count(), 1);
  await page.locator('#p2-district').selectOption('Distrito 8');
  await page.locator('#p2-commune').selectOption('Maipú');
  await page.locator('#p2-initial-office').selectOption('concejal');
  await click('[onclick="window.finishFullCharacterCreation()"]');
  await click('[data-view="view-elections"]');
  assert.match(await text('elections-calendar-cards'), /Concejal \(18\+\) · 10 cupos/);
  await click('[data-view="view-office"]');
  assert.match(await text('mandate-propose'), /Solicitar expediente a Alcaldía/);
  assert.match(await text('office-desk-title'), /Concejal de Maipú/);
  await click('#management-audit');
  assert.equal(await text('notice-title'), 'Informe solicitado');
  await page.locator('#mandate-policy').selectOption('lighting');
  await click('#mandate-propose');
  await click('[onclick="window.voteProject(false)"]');
  assert.equal(await text('notice-title'), 'Proyecto rechazado');
  assert.equal((await save()).mandate.budget, 12_000_000);
  await click(`[onclick="window.switchSubpanel('office', 'lobby', this)"]`);
  await page.locator('#mandate-bloc').selectOption('vecinal');
  await click('[onclick="window.holdHearing(false)"]');
  await click(`[onclick="window.switchSubpanel('office', 'overview', this)"]`);
  await click('[onclick="window.voteProject(false)"]');
  assert.equal((await save()).mandate.project.status, 'authorized');
  assert.equal((await save()).mandate.budget, 12_000_000);
  await click('#btn-hdr-advance-4');
  assert.match(await text('clock-date-disp'), /Semana 2 /);
  assert.equal((await save()).mandate.budget, 6_500_000);
  await go(2024, 11);
  assert.equal((await save()).mandate.completed, 1);
  await click('[data-view="view-office"]');
  await page.locator('#office-desk-actions button').first().click();
  assert.ok((await save()).career.some(event => event.type === 'Despacho'));
  assert.equal(await page.locator('#office-desk-actions button:enabled').count(), 0);
  assert.equal((await save()).territories[0].projects[0].name, 'Plan de luminarias');
  assert.ok((await save()).career.some(event => event.title.includes('Alcaldía responde')));
  await page.locator('details').filter({ has: page.locator('#agenda-plan') }).locator('summary').click();
  await page.locator('#agenda-plan').selectOption('territory');
  const oldWeek = (await save()).week;
  await page.locator('#btn-hdr-advance-1').dblclick();
  const checkpoint = await save();
  assert.equal(checkpoint.week, oldWeek + 1);
  assert.equal(checkpoint.agendaPlan, 'territory');
  assert.equal(checkpoint.player.hours, 48);
  await page.evaluate(() => localStorage.setItem('tpp_chile_clean_save', '{interrumpido'));
  await invoke('recoverGame');
  assert.equal(await text('notice-title'), 'Copia recuperada');
  assert.match(await text('clock-date-disp'), new RegExp(`Semana ${checkpoint.week} /`));
  await click('[data-view="view-elections"]');
  await page.locator('#election-office').selectOption('concejal');
  await click('#local-register');
  await go(2024, 44, true);
  assert.match(await text('elections-calendar-cards'), /Concejal · 10 cupos/);
  console.log('Perfil RM: teclado, cupos locales, rechazo, concesión, ejecución por Alcaldía y protección de doble clic: OK');

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
