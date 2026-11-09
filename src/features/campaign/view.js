import { campaignAllowance } from './funding.js';
import { localContactDiscount } from '../territory/rules.js';
import { ADS, CONTACTS, METRICS, VOLUNTEER_LIMIT, issueDemand } from './rules.js';
import { electionField } from '../elections/rules.js';
import { POLICIES_CATALOG } from '../character/programs.js';
import { campaignClimate, messageImpact, policyUrgency, publicAgenda } from '../electorate/rules.js';

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
  const field = election ? electionField(election, player, state.week, climate, state.roster) : null;
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
    const needed = Math.max(1, (aligned ? 1 : 2) - localContactDiscount(state, contact.id));
    const endorsed = campaign.endorsements[contact.id];
    return card(contact.name, `${contact.issues.join(' · ')}
${endorsed ? 'Respaldo confirmado' : `Reuniones: ${Math.min(needed, visits)}/${needed}`}`, {
      label: 'Reunirse (8 h)',
      disabled: !election || endorsed,
      run: () => window.meetContact(contact.id),
    });
  }));
  element('contacts-help').textContent = election
    ? 'Los contactos afines o conocidos de campañas anteriores requieren una reunión. Los demás requieren dos.'
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
  element('campaign-grant-balance').textContent = election
    ? `Aporte electoral disponible: $${format(election.campaignFunds ?? 0)} · abono semanal $${format(campaignAllowance(election.office))}. Se usa primero en gastos de campaña. El saldo vence al cerrar la elección.`
    : 'El aporte semanal se activa al inscribir una candidatura.';
  element('finance-campaign-grant').textContent = element('campaign-grant-balance').textContent;
  for (const key of Object.keys(ADS)) element(`marketing-${key}`).disabled = !election || Boolean(campaign[key]);
  const policyChoice = element('marketing-policy-choice');
  const previousChoice = policyChoice.value;
  policyChoice.replaceChildren(...chosen.map(policy => new Option(policy.name, policy.id)));
  if (chosen.some(policy => policy.id === previousChoice)) policyChoice.value = previousChoice;
  policyChoice.disabled = !election;

  element('campaign-climate').textContent = `Agenda: ${climate.agenda.title} · ${climate.agenda.topics.join(', ')}
Afinidad de tus ejes: ${pct(climate.fit * 100)} · coherencia con tu partido: ${player.partyId === 'IND' ? 'independiente' : pct(climate.coherence * 100)} · confianza por estabilidad del programa: ${pct(climate.trust * 100)} · gestión del mandato: ×${format(Number(climate.trackRecord.toFixed(3)))} · memoria comunal: ×${format(Number(climate.localBoost.toFixed(3)))} · conversión electoral: ×${format(Number(climate.multiplier.toFixed(2)))}`;
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
  revision.classList.remove('hidden');
  const current = element('revision-current');
  const next = element('revision-new');
  const currentId = current.value;
  const nextId = next.value;
  current.replaceChildren(...chosen.map(policy => new Option(policy.name, policy.id)));
  if (chosen.some(policy => policy.id === currentId)) current.value = currentId;
  const alternatives = POLICIES_CATALOG.filter(policy => !player.corePolicies.includes(policy.id))
    .sort((a, b) => policyUrgency(state, b.issue) - policyUrgency(state, a.issue));
  next.replaceChildren(...alternatives.map(policy => new Option(`${policyUrgency(state, policy.issue) >= 0.75 ? 'Prioridad alta · ' : ''}${policy.issue} · ${policy.name}`, policy.id)));
  if (alternatives.some(policy => policy.id === nextId)) next.value = nextId;
  const revised = campaign.lastProgramChange === state.year * 52 + state.week;
  element('revision-apply').disabled = revised;
  element('revision-status').textContent = revised ? 'Ya revisaste un eje esta semana.'
    : 'Cambiar un eje de baja urgencia por una prioridad alta cuesta 4 h y conserva credibilidad. Los demás cambios cuestan 12 h; en campaña consumen 3 PP, requieren cuatro semanas entre cambios ordinarios y afectan la confianza.';

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
