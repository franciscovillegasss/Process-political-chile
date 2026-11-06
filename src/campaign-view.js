import { CONTACTS, METRICS, VOLUNTEER_LIMIT, issueDemand } from './campaign.js';
import { electionField } from './election.js';
import { POLICIES_CATALOG } from './programs.js';

const element = id => document.getElementById(id);

function card(title, detail, action) {
  const node = document.createElement('article');
  node.className = 'p-3 bg-stone-50 border border-stone-300 rounded space-y-1 text-xs';
  const heading = document.createElement('h4');
  heading.className = 'font-bold text-sm text-slate-900';
  heading.textContent = title;
  const paragraph = document.createElement('p');
  paragraph.className = 'text-slate-700 whitespace-pre-line';
  paragraph.textContent = detail;
  node.append(heading, paragraph);
  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'px-2 py-1 bg-blue-800 text-white rounded disabled:opacity-50';
    button.textContent = action.label;
    button.disabled = action.disabled;
    button.onclick = action.run;
    node.append(button);
  }
  return node;
}

const format = value => value.toLocaleString('es-CL');
const pct = value => `${format(Number(value.toFixed(1)))} %`;

export function renderCampaign(state, election) {
  const { player, campaign, volunteers } = state;
  const field = election ? electionField(election, player, state.week) : null;
  const chosen = player.corePolicies.map(id => POLICIES_CATALOG.find(policy => policy.id === id)).filter(Boolean);
  const chosenTopics = new Set(chosen.map(policy => policy.issue));
  element('opponents-list-container').replaceChildren(...(field
    ? field.rivals.map(rival => card(rival.name, `${rival.list} · ${format(rival.votes)} votos proyectados`))
    : [card('Sin contienda activa', 'Inscribe tu candidatura en Elecciones para ver a quienes compiten por el mismo cargo.')]));

  element('contacts-list-container').replaceChildren(...CONTACTS.map(contact => {
    const visits = campaign.contacts[contact.id];
    const aligned = contact.issues.some(issue => chosenTopics.has(issue));
    const needed = aligned ? 1 : 2;
    return card(contact.name, `${contact.issues.join(' · ')}\n${visits >= needed ? 'Respaldo confirmado' : `Reuniones: ${visits}/${needed}`}`, {
      label: 'Reunirse (8 h)',
      disabled: !election || visits >= needed,
      run: () => window.meetContact(contact.id),
    });
  }));
  element('contacts-help').textContent = election
    ? 'Los contactos afines a tus ejes necesitan una reunión para respaldarte. Los demás, dos.'
    : 'Inscribe una candidatura para pedir reuniones y conseguir respaldos.';

  const polls = campaign.polls.filter(poll => poll && typeof poll === 'object');
  element('polls-history-container').replaceChildren(...(polls.length
    ? polls.map(poll => card(`Semana ${poll.week} · ${poll.year} · ${poll.office}`,
      `Tu intención de voto: ${pct(Number(poll.share))} (±${poll.margin} pp)\nPrincipal rival: ${poll.rival} · ${pct(Number(poll.rivalShare))}`))
    : [card('Sin sondeos', 'Un sondeo estima el apoyo en la contienda actual. Las cifras pueden cambiar antes del escrutinio.')]));
  element('commission-poll').disabled = !election || polls.some(poll => poll.year === state.year && poll.week === state.week);
  element('marketing-status').textContent = election
    ? `Pautas de esta semana · Digital: ${campaign.digital ? 'contratada' : 'disponible'} · Territorial: ${campaign.palomas ? 'instalada' : 'disponible'}`
    : 'Inscribe una candidatura para contratar publicidad.';
  for (const key of ['digital', 'palomas']) element(`marketing-${key}`).disabled = !election || Boolean(campaign[key]);

  element('player-core-policies-container').replaceChildren(...chosen.map(policy => {
    const priority = issueDemand(state, policy.issue);
    return card(policy.name, `${policy.issue} · ${priority ? 'Alta demanda nacional · bono de apoyo' : 'Demanda normal'}`, {
      label: 'Promover este eje (10 h)',
      disabled: !election || Boolean(campaign.policyWeek),
      run: () => window.promotePolicy(policy.id),
    });
  }));
  element('policy-campaign-help').textContent = election
    ? 'Puedes promover un eje por semana. Las prioridades del país cambian con las métricas.'
    : 'Estos son tus ejes. Inscribe una candidatura para promover uno por semana.';

  const trained = Math.min(campaign.trained, volunteers);
  element('volunteers-count-disp').textContent = `${format(volunteers)} / ${VOLUNTEER_LIMIT}`;
  element('volunteer-status').textContent = `${format(trained)} capacitados · ${campaign.mobilized ? `${campaign.mobilized} movilizados esta semana` : 'Brigada disponible esta semana'}`;
  element('recruit-volunteers').disabled = volunteers >= VOLUNTEER_LIMIT;
  element('train-volunteers').disabled = trained >= volunteers;
  element('deploy-volunteers').disabled = !election || !volunteers || Boolean(campaign.mobilized);
  element('campaign-activity').replaceChildren(...campaign.activity
    .filter(entry => entry && typeof entry === 'object')
    .slice(0, 5)
    .map(entry => card(`Semana ${entry.week} · ${entry.title}`, String(entry.detail))));
}

export function renderCountry(state) {
  const signals = [...new Set(POLICIES_CATALOG.map(policy => policy.issue))].filter(issue => issueDemand(state, issue));
  const cards = METRICS.map(({key, label}) => {
    const delta = state.macroTrend[key];
    const change = delta > 0 ? `+${format(delta)}` : format(delta);
    return card(label, `${pct(state.macroMetrics[key])} · ${change} pp desde el último corte`);
  });
  cards.push(card('Tensión social', pct(state.socialTension)));
  element('macro-metrics-grid').replaceChildren(...cards);
  element('macro-priorities').textContent = signals.length
    ? `Prioridades del electorado: ${signals.join(' · ')}.`
    : 'Sin temas en alerta en este corte.';
  element('stat-tension').textContent = pct(state.socialTension);
}
