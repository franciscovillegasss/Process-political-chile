import { CONTACTS, METRICS, VOLUNTEER_LIMIT, issueDemand } from './campaign.js';
import { electionField } from './election.js';
import { POLICIES_CATALOG } from './programs.js';
import { campaignClimate, messageImpact, publicAgenda } from './electorate.js';

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
  const climate = campaignClimate(state);
  const field = election ? electionField(election, player, state.week, climate) : null;
  const chosen = player.corePolicies.map(id => POLICIES_CATALOG.find(policy => policy.id === id)).filter(Boolean);
  const chosenTopics = new Set(chosen.map(policy => policy.issue));
  element('opponents-list-container').replaceChildren(...(field
    ? field.rivals.map(rival => {
      const strength = rival.votes / field.rivals[0].votes;
      const standing = strength >= 0.85 ? 'Competitivo' : strength >= 0.6 ? 'Presencia media' : 'Presencia baja';
      return card(rival.name, `${rival.list} · ${standing}`);
    })
    : [card('Sin contienda activa', 'Inscribe tu candidatura en Elecciones para ver a quienes compiten por el mismo cargo.')]));

  element('contacts-list-container').replaceChildren(...CONTACTS.map(contact => {
    const visits = campaign.contacts[contact.id];
    const aligned = contact.issues.some(issue => chosenTopics.has(issue));
    const needed = aligned ? 1 : 2;
    const endorsed = campaign.endorsements[contact.id];
    return card(contact.name, `${contact.issues.join(' · ')}
${endorsed ? 'Respaldo confirmado' : `Reuniones: ${Math.min(needed, visits)}/${needed}`}`, {
      label: 'Reunirse (8 h)',
      disabled: !election || endorsed,
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

  element('campaign-climate').textContent = `Agenda: ${climate.agenda.title} · ${climate.agenda.topics.join(', ')}
Afinidad de tus ejes: ${pct(climate.fit * 100)} · coherencia con tu partido: ${player.partyId === 'IND' ? 'independiente' : pct(climate.coherence * 100)} · confianza por estabilidad del programa: ${pct(climate.trust * 100)} · conversión electoral: ×${format(Number(climate.multiplier.toFixed(2)))}`;
  element('player-core-policies-container').replaceChildren(...climate.policyResults.map(item => {
    const { policy, urgency, fit, coherence, emphasis } = item;
    const demand = urgency >= 0.75 ? 'Alta demanda' : urgency >= 0.45 ? 'Demanda media' : 'Demanda baja';
    const impact = messageImpact(item, player.attributes.oratory);
    return card(policy.name, `${policy.issue} · ${demand}
Afinidad con el electorado: ${pct(fit * 100)}${player.partyId === 'IND' ? '' : ` · coherencia partidaria: ${pct(coherence * 100)}`}
Énfasis actual: ${format(Number(emphasis.toFixed(1)))} / 4 · efecto estimado al promover: +${impact} puntos`, {
      label: 'Promover este eje (10 h)',
      disabled: !election || Boolean(campaign.policyWeek),
      run: () => window.promotePolicy(policy.id),
    });
  }));
  element('policy-campaign-help').textContent = election
    ? 'Promueve un eje por semana. La demanda y la afinidad pesan por separado. Repetir un mensaje saturado rinde menos.'
    : 'Estos son tus ejes. Inscribe una candidatura para promoverlos y adaptar el programa.';
  const revision = element('policy-revision');
  revision.classList.toggle('hidden', !election);
  if (election) {
    element('revision-current').replaceChildren(...chosen.map(policy => new Option(policy.name, policy.id)));
    element('revision-new').replaceChildren(...POLICIES_CATALOG.filter(policy => !player.corePolicies.includes(policy.id)).map(policy => new Option(`${policy.issue} · ${policy.name}`, policy.id)));
    const remaining = election.lastRevision ? Math.max(0, 4 - (state.week - election.lastRevision)) : 0;
    element('revision-apply').disabled = Boolean(remaining);
    element('revision-status').textContent = remaining
      ? `Podrás hacer otro cambio en ${remaining} semanas. Cambios en esta contienda: ${election.revisions}.`
      : `Un cambio cuesta 12 h y 3 PP. Cada revisión reduce la confianza en esta contienda. Cambios: ${election.revisions}.`;
  }

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
  const agenda = publicAgenda(state);
  element('macro-agenda').textContent = `${agenda.title} · Electorado simulado: ${agenda.weights[0]} % reformista, ${agenda.weights[1]} % moderado, ${agenda.weights[2]} % orden y mercado.`;
  element('macro-priorities').textContent = signals.length
    ? `Prioridades del electorado: ${signals.join(' · ')}.`
    : 'Sin temas en alerta en este corte.';
  element('stat-tension').textContent = pct(state.socialTension);
}
