import './styles.css';
import { PACTS, allocateSeats, LOCAL_REGISTRATION, LOCAL_ACTIONS, countElection, electionField, OFFICES, cycleOffices, electionWeek, officeTerritory } from './election.js';

import { CHILE_GEO, CHILE_PARTIES, STAFF_CATALOG } from './catalogs.js';
import { POLICIES_CATALOG, PROGRAM_PRESETS, programPosition } from './programs.js';
import { ADS, CONTACTS, VOLUNTEER_LIMIT, initialCampaign, focusBonus, weeklyCampaign } from './campaign.js';
import { renderCampaign, renderCountry } from './campaign-view.js';
import { campaignClimate, policyUrgency, decayMessages, messageImpact, newMessages, publicAgenda } from './electorate.js';
import { calendarWeek, completeProject, fundraisingYield, giveUpOffice, newRoster, openMandate, PROJECT_COST, recordCareer, renewRoster, RETIREMENT_AGE } from './career.js';

const element = id => document.getElementById(id);
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const clp = amount => `$${amount.toLocaleString('es-CL')}`;
const warn = message => window.showToast('Acción no disponible', message, 'warning');

function pay({ hours, funds = 0, points = 0 }) {
  const player = GAME_STATE.player;
  if (player.hours < hours || player.funds < funds || player.politicalPoints < points) {
    warn('No tienes suficientes horas, fondos o puntos políticos.');
    return false;
  }
  player.hours -= hours;
  player.funds -= funds;
  player.politicalPoints -= points;
  return true;
}

function activeElection() {
  const { localElection, year, week } = GAME_STATE;
  return localElection?.year === year && localElection.office && !localElection.result &&
    (localElection.runoffWeek || electionWeek(year)) > week ? localElection : null;
}

function requireElection() {
  const election = activeElection();
  if (!election) warn('Inscribe una candidatura en Elecciones para usar esta acción.');
  return election;
}

function refreshCampaign() {
  renderPlayerStats();
  renderLocalElection();
  renderCampaign(GAME_STATE, activeElection());
}

function reportCampaign(title, detail) {
  const { campaign, week } = GAME_STATE;
  campaign.activity.unshift({ week, title, detail });
  campaign.activity.length = Math.min(campaign.activity.length, 20);
  window.showToast(title, detail, 'success');
  refreshCampaign();
}

const registrationWeek = 8;
const canRegister = ({ year, week, localElection }) =>
  electionWeek(year) !== null && week >= registrationWeek && week < electionWeek(year) && localElection?.year !== year;

function eligibleOffices(player, year) {
  return cycleOffices(year, player.region).filter(([id, office]) =>
    player.age >= office.age && officeTerritory(office, player, CHILE_GEO) &&
    (id !== 'presidente' || player.officeId !== 'presidente'));
}

window.registerCandidate = function() {
  const { year, player } = GAME_STATE;
  if (!canRegister(GAME_STATE)) return warn('La inscripción no está abierta o ya tienes una candidatura.');
  const id = element('election-office').value;
  const selection = eligibleOffices(player, year).find(([key]) => key === id);
  if (!selection) return warn('Selecciona un cargo disponible para tu edad y territorio.');
  if (!pay({ ...LOCAL_REGISTRATION, funds: registrationCost() })) return;
  const pact = PACTS.find(list => `pact-${list.id}` === player.activePactId)?.id || 'ind';
  GAME_STATE.localElection = { year, office: id, pact, support: 0, runoffWeek: 0, runoffRival: 0, firstRound: '', messages: newMessages(), revisions: 0, lastRevision: 0, result: '' };
  if (GAME_STATE.campaign.contactYear !== year) {
    GAME_STATE.campaign.contactYear = year;
    const { contacts, endorsements } = initialCampaign();
    Object.assign(GAME_STATE.campaign, { contacts, endorsements });
  }
  recordCareer(GAME_STATE, 'Candidatura', `Inscripción para ${OFFICES[id].name}.`);
  reportCampaign('Candidatura inscrita', `Ya puedes hacer campaña para ${OFFICES[id].name} y consultar a tus oponentes.`);
};

window.executeCampaignAction = function(key) {
  if (!Object.hasOwn(LOCAL_ACTIONS, key)) return;
  const election = requireElection();
  const action = LOCAL_ACTIONS[key];
  if (!election || !pay(action)) return;
  const { player, campaign } = GAME_STATE;
  const policies = POLICIES_CATALOG.filter(policy => player.corePolicies.includes(policy.id));
  const issueMatch = policies.some(policy => action.issues.includes(policy.issue));
  const repeats = campaign.actionUses[key]++;
  const support = Math.round(action.support * (0.5 + player.attributes[action.attribute] / 100) *
    (issueMatch ? 1.15 : 1) * (key === 'puerta_a_puerta' ? 1 + focusBonus(GAME_STATE) / 100 : 1) / (1 + repeats * 0.38));
  election.support += support;
  reportCampaign('Actividad de campaña', `+${support} puntos de campaña.${repeats ? ' La repetición de este formato reduce su efecto.' : ''}${issueMatch ? ' Incluye afinidad programática.' : ''}`);
};

window.fundraiseAction = function() {
  const { campaign, player } = GAME_STATE;
  if (campaign.fundraising >= 2) return warn('Puedes organizar hasta dos cenas por semana.');
  if (!pay({ hours: 12 })) return;
  const raised = fundraisingYield(GAME_STATE, staffTotals().fundraisingBonus);
  campaign.fundraising++;
  campaign.donorFatigue = Math.min(8, campaign.donorFatigue + 1);
  player.funds += raised;
  reportCampaign('Recaudación', `+${clp(raised)} en fondos de campaña.`);
};

window.launchAdCampaign = function(key) {
  if (!Object.hasOwn(ADS, key)) return;
  const election = requireElection();
  const { campaign, player } = GAME_STATE;
  if (!election || campaign[key]) return;
  const ad = ADS[key];
  const bonuses = staffTotals();
  const funds = Math.round(ad.funds * (key === 'palomas' ? 1 - bonuses.territorialDiscount : 1));
  if (!pay({ hours: ad.hours, funds })) return;
  campaign[key] = 1;
  const recognition = Math.min(100 - player.nameRecognition, ad.recognition);
  player.nameRecognition += recognition;
  const support = Math.round(ad.support * (1 + bonuses.advertisingBonus));
  election.support += support;
  reportCampaign(ad.name, `${clp(funds)} invertidos · +${recognition.toFixed(1)} pp de reconocimiento y +${support} puntos de campaña.`);
};

window.meetContact = function(id) {
  const election = requireElection();
  const contact = CONTACTS.find(item => item.id === id);
  if (!election || !contact) return;
  const { campaign, player } = GAME_STATE;
  const aligned = POLICIES_CATALOG.some(policy => player.corePolicies.includes(policy.id) && contact.issues.includes(policy.issue));
  const needed = aligned ? 1 : 2;
  if (campaign.endorsements[id] || !pay({ hours: 8 })) return;
  campaign.contacts[id]++;
  if (campaign.contacts[id] >= needed) {
    campaign.endorsements[id] = true;
    election.support += contact.support;
    reportCampaign('Respaldo confirmado', `${contact.name} · +${contact.support} puntos de campaña.`);
  } else reportCampaign('Contacto realizado', `${contact.name} · falta una reunión para conseguir su respaldo.`);
};

window.commissionPoll = function() {
  const election = requireElection();
  const { campaign, player, year, week } = GAME_STATE;
  if (!election || campaign.polls.some(poll => poll?.year === year && poll.week === week) ||
      !pay({ hours: 0, funds: 1_000_000 })) return;
  const field = electionField(election, player, week, campaignClimate(GAME_STATE), GAME_STATE.roster);
  const rival = field.rivals[0];
  const precision = 1 - staffTotals().pollAccuracy;
  const margin = 3 * precision;
  const sampleOffset = ((week * 17 + year) % 7 - 3) / 2 * precision;
  const share = Math.max(0, Math.min(100, field.votes / field.total * 100 + sampleOffset));
  campaign.polls.unshift({
    year, week, office: field.office.name, share, rival: rival.name,
    rivalShare: Math.max(0, Math.min(100, rival.votes / field.total * 100 - sampleOffset)), margin,
  });
  campaign.polls.length = Math.min(campaign.polls.length, 12);
  reportCampaign('Sondeo disponible', `Tu intención de voto estimada es ${share.toFixed(1)} % (±${margin.toLocaleString('es-CL')} pp). Consulta Encuestas.`);
};

window.promotePolicy = function(id) {
  const election = requireElection();
  if (!election) return;
  const { campaign, player } = GAME_STATE;
  const item = campaignClimate(GAME_STATE).policyResults.find(entry => entry.policy.id === id);
  if (!item || campaign.policyWeek || !pay({ hours: 10 })) return;
  campaign.policyWeek = 1;
  const support = messageImpact(item, player.attributes.oratory);
  election.messages[id] = Math.min(4, item.emphasis + 1.6);
  election.support += support;
  reportCampaign('Eje promovido', `${item.policy.name} · +${support} puntos de campaña. El énfasis irá perdiendo fuerza si dejas de comunicarlo.`);
};

window.revisePolicy = function() {
  const election = requireElection();
  if (!election) return;
  const { player, week } = GAME_STATE;
  const previous = element('revision-current').value;
  const replacement = element('revision-new').value;
  if (election.lastRevision && week - election.lastRevision < 4) return warn('Debes esperar cuatro semanas entre cambios de programa.');
  const slot = player.corePolicies.indexOf(previous);
  if (slot < 0 || player.corePolicies.includes(replacement) || !POLICIES_CATALOG.some(policy => policy.id === replacement)) {
    return warn('Elige un eje nuevo y uno de tus tres compromisos para reemplazar.');
  }
  if (!pay({ hours: 12, points: 3 })) return;
  player.corePolicies[slot] = replacement;
  election.messages[previous] = 0;
  election.lastRevision = week;
  election.revisions++;
  updateCompass('profile', player.corePolicies);
  reportCampaign('Programa actualizado', 'El nuevo eje entra en vigor. Cada cambio resta confianza durante esta elección.');
};

window.manageVolunteers = function(action) {
  const { campaign, volunteers } = GAME_STATE;
  if (action === 'recruit') {
    const recruits = Math.max(0, Math.min(30, VOLUNTEER_LIMIT - volunteers));
    if (!recruits || !pay({ hours: 8, funds: 100_000 })) return;
    GAME_STATE.volunteers += recruits;
    reportCampaign('Reclutamiento', `+${recruits} voluntarios se sumaron a la brigada.`);
  } else if (action === 'train') {
    const trainees = Math.max(0, Math.min(25, volunteers - campaign.trained));
    if (!trainees || !pay({ hours: 8 })) return;
    campaign.trained += trainees;
    reportCampaign('Capacitación', `${trainees} voluntarios capacitados para movilización electoral.`);
  } else if (action === 'deploy') {
    const election = requireElection();
    if (!election || !volunteers || campaign.mobilized || !pay({ hours: 6 })) return;
    campaign.mobilized = Math.min(40, volunteers);
    const support = campaign.mobilized + Math.min(campaign.mobilized, campaign.trained);
    election.support += support;
    reportCampaign('Brigada movilizada', `${campaign.mobilized} voluntarios · +${support} puntos de campaña. Disponibles nuevamente la próxima semana.`);
  }
};

function resolveElection() {
  const { localElection, year, player } = GAME_STATE;
  if (localElection?.year === year && localElection.result) return;
  const candidate = localElection?.year === year && localElection.office ? localElection : null;
  const id = candidate?.office || 'concejal';
  const districtSeats = id === 'diputado' ? CHILE_GEO[player.region]?.districts[player.district]?.seats : undefined;
  const climate = campaignClimate(GAME_STATE);
  const result = candidate ? countElection(candidate, player, districtSeats, GAME_STATE.week, climate, GAME_STATE.roster, true)
    : { won: false, summary: 'Sin candidatura inscrita en este ciclo electoral.' };
  if (year % 4 === 1 && GAME_STATE.week === electionWeek(year)) updateCongress(climate);
  if (result.runoff !== undefined) {
    Object.assign(candidate, { runoffWeek: GAME_STATE.week + 4, runoffRival: result.runoff, firstRound: result.summary });
    recordCareer(GAME_STATE, 'Primera vuelta', result.summary);
    return;
  }
  const { won, summary } = result;
  GAME_STATE.localElection = { ...(candidate || { year, office: '', pact: 'ind', support: 0 }), result: summary };
  if (candidate) {
    recordCareer(GAME_STATE, 'Elección', summary);
    if (!won) {
      const rival = electionField(candidate, player, GAME_STATE.week, climate, GAME_STATE.roster).rivals[0];
      const person = GAME_STATE.roster[rival.slot];
      person.victories++;
      person.office = id;
      recordCareer(GAME_STATE, 'Contienda', `${person.name} encabezó el voto rival en ${OFFICES[id].name}.`);
    }
  }
  const outgoing = player.officeEndYear > 0 ? player.officeEndYear === year
    : player.officeId && cycleOffices(year, player.region).some(([officeId]) => officeId === player.officeId);
  if (won) {
    if (GAME_STATE.mandate?.project) recordCareer(GAME_STATE, 'Mandato', 'Un proyecto del mandato anterior quedó pendiente al cambiar de período.');
    player.officeId = id;
    player.currentOffice = officeTitle(id, player);
    player.officeEndYear = year + (id === 'senador' ? 8 : 4);
    openMandate(GAME_STATE);
    GAME_STATE.localManagement = 'pending';
  } else if (outgoing) {
    recordCareer(GAME_STATE, 'Mandato', `Finalizó el mandato en ${player.currentOffice}.`);
    giveUpOffice(GAME_STATE);
  }
}

function officeTitle(id, player) {
  const office = OFFICES[id];
  if (!office) return 'Ciudadano sin Cargo';
  const territory = officeTerritory(office, player, CHILE_GEO);
  return office.scope === 'country' ? office.name : `${office.name} de ${territory}`;
}

window.manageLocalOffice = function(choice) {
  const { player, localManagement } = GAME_STATE;
  if (localManagement !== 'pending' || !['agenda', 'audit'].includes(choice)) return;
  if (!pay({ hours: 12, points: choice === 'agenda' ? 8 : 0 })) return;
  GAME_STATE.localManagement = choice;
  if (choice === 'agenda') player.approval = Math.min(100, player.approval + 6);
  else {
    player.approval = Math.min(100, player.approval + 2);
    player.politicalPoints += 5;
  }
  recordCareer(GAME_STATE, 'Gestión', choice === 'agenda' ? 'Presentó su agenda de mandato.' : 'Realizó la fiscalización inicial.');
  renderPlayerStats();
  renderLocalElection();
};

window.buildPoliticalCapital = function() {
  const { campaign, player } = GAME_STATE;
  if (calendarWeek(GAME_STATE) - campaign.lastCommunity < 4) return warn('El trabajo territorial da PP una vez cada cuatro semanas.');
  if (!pay({ hours: 12 })) return;
  campaign.lastCommunity = calendarWeek(GAME_STATE);
  const points = player.politicalPoints < 10 ? 5 : 3;
  player.politicalPoints += points;
  reportCampaign('Trabajo territorial', `+${points} PP al organizar una actividad comunitaria.`);
};

window.restPolitician = function() {
  const { campaign, player } = GAME_STATE;
  if (campaign.rested || player.hours >= player.maxHours) return warn('Puedes recuperar horas una vez por semana, después de una actividad.');
  campaign.rested = true;
  const recovered = Math.min(6, player.maxHours - player.hours);
  player.hours += recovered;
  reportCampaign('Descanso', `+${recovered} horas recuperadas esta semana.`);
};

window.personalContribution = function() {
  const { player } = GAME_STATE;
  const amount = Math.min(500_000, player.personalFunds);
  if (!amount) return warn('Agotaste tus ahorros personales.');
  player.personalFunds -= amount;
  player.funds += amount;
  reportCampaign('Aporte propio', `${clp(amount)} transferidos desde tus ahorros personales.`);
};

window.proposeProject = function() {
  const { mandate, player } = GAME_STATE;
  const policy = POLICIES_CATALOG.find(item => item.id === element('mandate-policy').value && player.corePolicies.includes(item.id));
  if (!mandate || mandate.project || mandate.budget < PROJECT_COST || !policy) return warn('Necesitas un cargo, presupuesto disponible y un eje programático.');
  if (!pay({ hours: 10, points: 3 })) return;
  const scope = OFFICES[player.officeId].scope;
  const projectName = scope === 'commune' ? `Plan comunal de ${policy.issue.toLowerCase()}`
    : player.officeId === 'gobernador' || player.officeId === 'core' ? `Programa regional de ${policy.issue.toLowerCase()}` : policy.name;
  mandate.project = { name: projectName, issue: policy.issue, due: 0, relevant: false };
  mandate.hearings = 0;
  recordCareer(GAME_STATE, 'Proyecto', `Presentó: ${projectName} · eje ${policy.name}.`);
  reportCampaign('Proyecto presentado', 'Reúnete con dos grupos de interés antes de votar.');
};

window.holdHearing = function(chamber = false) {
  if (chamber && GAME_STATE.player.officeId !== (GAME_STATE.congress.activeChamber === 'senado' ? 'senador' : 'diputado')) {
    return warn('Solo puedes negociar en la cámara en la que ocupas un escaño.');
  }
  const { mandate } = GAME_STATE;
  if (!mandate?.project || mandate.project.due || mandate.hearings >= 2) return warn('Necesitas un proyecto pendiente de acuerdo.');
  if (!pay({ hours: 8 })) return;
  mandate.hearings++;
  reportCampaign('Acuerdo de gestión', `Respaldo conseguido (${mandate.hearings}/2).`);
};

window.voteProject = function(chamber) {
  const { mandate, player } = GAME_STATE;
  if (chamber && player.officeId !== (GAME_STATE.congress.activeChamber === 'senado' ? 'senador' : 'diputado')) {
    return warn('Solo puedes votar en la cámara en la que ocupas un escaño.');
  }
  if (!mandate?.project || mandate.project.due || mandate.hearings < 2) return warn('Consigue dos respaldos antes de votar.');
  if (!pay({ hours: 8 })) return;
  mandate.budget -= PROJECT_COST;
  mandate.project.relevant = policyUrgency(GAME_STATE, mandate.project.issue) >= 0.75;
  const delay = Math.max(3, 10 - Math.floor(player.attributes.management / 15));
  mandate.project.due = calendarWeek(GAME_STATE) + delay;
  if (['diputado', 'senador'].includes(player.officeId)) {
    const total = player.officeId === 'senador' ? 50 : 155;
    const votes = Math.floor(total / 2) + 1 + mandate.hearings;
    GAME_STATE.legislativeHistory.unshift({
      number: `Proyecto ${GAME_STATE.year}-${GAME_STATE.week}`, title: mandate.project.name,
      date: `Semana ${GAME_STATE.week}, ${GAME_STATE.year}`, type: 'Simulación', quorum: `${votes} / ${total}`,
      yes: votes, no: total - votes, abs: 0, area: mandate.project.issue === 'Seguridad' ? 'crime' : 'taxes',
      impact: 'Aprobado en la cámara de origen. Ejecución simulada programada.',
    });
    window.renderLegislativeHistory();
  }
  recordCareer(GAME_STATE, 'Votación', `Aprobado: ${mandate.project.name}.`);
  reportCampaign('Proyecto aprobado', `Presupuesto asignado. Resultados en ${delay} semanas.`);
};

function retire() {
  const { player, year } = GAME_STATE;
  recordCareer(GAME_STATE, 'Retiro', `${player.name} deja la primera línea a los ${player.age} años.`);
  giveUpOffice(GAME_STATE);
  const heir = element('successor-name').value.trim().slice(0, 60) || `${player.name.split(' ')[0]} ${player.name.split(' ').at(-1)} (${year})`;
  Object.assign(player, { name: heir, age: 25, approval: 52, politicalPoints: 20,
    nameRecognition: Math.round(player.nameRecognition * 0.4), funds: Math.round(3_000_000 + player.funds * 0.25), hiredStaffIds: [], hours: 60, maxHours: 60, personalFunds: 2_000_000 });
  GAME_STATE.campaign = initialCampaign();
  GAME_STATE.volunteers = Math.max(30, Math.floor(GAME_STATE.volunteers / 2));
  recordCareer(GAME_STATE, 'Sucesión', `${heir} continúa la trayectoria política de la familia.`);
  element('successor-name').value = '';
  window.renderAll();
  window.showToast('Nueva generación', `${heir} continúa con el legado y parte de la red territorial.`);
}

window.retirePolitician = function() {
  if (GAME_STATE.player.age < 70 || activeElection()) return warn('El retiro voluntario está disponible desde los 70 años entre campañas.');
  retire();
};

function renderLocalElection() {
  const { localElection, localManagement, year, week, player } = GAME_STATE;
  const votingWeek = electionWeek(year);
  const cycle = cycleOffices(year, player.region);
  const eligible = eligibleOffices(player, year);
  const select = element('election-office');
  const previous = select.value;
  select.replaceChildren(...eligible.map(([id, office]) =>
    new Option(`${office.name} · ${officeTerritory(office, player, CHILE_GEO)} · ${office.age}+`, id)));
  if (eligible.some(([id]) => id === previous)) select.value = previous;
  select.disabled = element('local-register').disabled = !canRegister(GAME_STATE) || !eligible.length;
  const calendar = votingWeek
    ? `Elección ${year} · inscripción semanas ${registrationWeek} a ${votingWeek - 1} (10 PP y ${clp(registrationCost())}) · escrutinio semana ${votingWeek}.
${cycle.map(([id, office]) =>
      `${office.name} (${office.age}+)${eligible.some(([key]) => key === id) ? '' : ' · no habilitada'}`).join(' | ')}`
    : `Año sin elecciones regulares. Próximo ciclo: ${year + (4 - year % 4)}.`;
  const campaign = localElection?.year === year && !localElection.result
    ? `Candidatura inscrita: ${officeTitle(localElection.office, player)} · ${localElection.support.toLocaleString('es-CL')} puntos de campaña acumulados. Consulta Encuestas para estimar la intención de voto.` : '';
  const firstRound = localElection?.firstRound && !localElection.result ? `${localElection.firstRound} Votación en la semana ${localElection.runoffWeek}.` : '';
  const result = localElection?.result ? `Resultado ${localElection.year}
${localElection.result}` : '';
  element('elections-calendar-cards').textContent = [calendar, campaign, firstRound, result].filter(Boolean).join('\n\n');
  const missing = Math.max(0, LOCAL_REGISTRATION.points - player.politicalPoints);
  element('registration-recovery').textContent = missing ? `Faltan ${missing} PP. Puedes recuperarlos con trabajo territorial cada cuatro semanas.` : 'El trabajo territorial da puntos políticos dentro y fuera de campaña.';
  element('local-management').classList.toggle('hidden', !localManagement);
  element('management-audit').textContent = OFFICES[player.officeId]?.scope === 'commune'
    ? 'Fiscalizar el municipio (12 h)' : 'Revisar el uso de recursos públicos (12 h)';
  const policy = POLICIES_CATALOG.find(item => item.id === player.corePolicies[0]);
  element('local-management-status').textContent = {
    pending: `Primera decisión en tu nuevo cargo. Impulsa tu primer eje (${policy?.name || 'agenda local'}) para ganar 6 puntos de aprobación o fiscaliza para ganar 2 puntos de aprobación y 5 PP.`,
    agenda: 'Impulsaste tu primer eje · +6 puntos de aprobación.',
    audit: 'Revisaste el uso de recursos públicos · +2 puntos de aprobación y +5 PP.',
  }[localManagement] || '';
  element('local-management').querySelectorAll('button').forEach(button => {
    button.disabled = localManagement !== 'pending';
  });
  renderMandate();
}

function renderMandate() {
  const { mandate, career, player } = GAME_STATE;
  element('mandate-actions').classList.toggle('hidden', !mandate);
  element('office-budget-disp').textContent = clp(mandate?.budget || 0);
  element('office-bills-disp').textContent = mandate?.completed || 0;
  if (mandate) {
    const select = element('mandate-policy');
    const previous = select.value;
    select.replaceChildren(...POLICIES_CATALOG.filter(policy => player.corePolicies.includes(policy.id))
      .map(policy => new Option(policy.name, policy.id)));
    if ([...select.options].some(option => option.value === previous)) select.value = previous;
    element('mandate-status').textContent = mandate.project
      ? `${mandate.project.name} · ${mandate.project.due ? `ejecución en ${Math.max(0, mandate.project.due - calendarWeek(GAME_STATE))} semanas` : `${mandate.hearings}/2 respaldos`}`
      : `Selecciona un eje. El presupuesto de ejecución es ${clp(PROJECT_COST)} por proyecto.`;
  }
  element('lobby-audiences-container').textContent = !mandate?.project ? 'Presenta un proyecto para convocar audiencias.'
    : mandate.project.due ? 'Las audiencias finalizaron. El proyecto está en ejecución.'
      : `Respaldo obtenido: ${mandate.hearings}/2. Participan juntas vecinales y organizaciones del territorio.`;
  const records = career.filter(entry => entry.name === player.name && ['Proyecto','Votación','Gestión'].includes(entry.type)).slice(0, 12);
  element('office-passed-bills-container').textContent = records.length ? records.map(entry => `${entry.date} · ${entry.title}`).join('\n')
    : 'Todavía no hay decisiones de gestión registradas.';
}

function renderCareer() {
  const list = element('career-timeline');
  list.replaceChildren(...GAME_STATE.career.map(entry => {
    const row = document.createElement('li');
    row.className = 'whitespace-pre-line border-b border-stone-200 pb-1';
    row.textContent = `${entry.date} · ${entry.name} · ${entry.type} · ${entry.title}`;
    return row;
  }));
}

window.changeDomicile = function() {
  if (GAME_STATE.player.officeId || activeElection()) return warn('Puedes cambiar de domicilio entre mandatos y fuera de campaña.');
  const select = element('domicile-select');
  if (!select.value) return warn('Selecciona tu nuevo domicilio.');
  const [region, district, commune] = JSON.parse(select.value);
  if (!CHILE_GEO[region]?.districts[district]?.communes.includes(commune) || GAME_STATE.player.commune === commune) {
    return warn('Elige una comuna distinta.');
  }
  Object.assign(GAME_STATE.player, { region, district, commune });
  GAME_STATE.player.nameRecognition = Math.max(8, GAME_STATE.player.nameRecognition - 8);
  GAME_STATE.campaign.focus = -1;
  recordCareer(GAME_STATE, 'Domicilio', `Cambió su domicilio electoral a ${commune}.`);
  window.renderAll();
  window.showToast('Domicilio actualizado', `La siguiente candidatura utilizará ${commune} y su distrito.`, 'success');
};

function initDomicile() {
  const select = element('domicile-select');
  select.add(new Option('Selecciona una comuna', ''));
  for (const [region, data] of Object.entries(CHILE_GEO)) {
    for (const [district, entry] of Object.entries(data.districts)) {
      for (const commune of entry.communes) select.add(new Option(`${commune} · ${district}`, JSON.stringify([region, district, commune])));
    }
  }
}

const initialState = () => ({
  career: [],
  roster: newRoster(2024),
  mandate: null,
  campaign: initialCampaign(),
  macroTrend: { inflation: 0, gdpGrowth: 0, unemployment: 0, victimizationRate: 0 },
  localElection: null,
  localManagement: null,
  week: 1,
  year: 2024,
  month: 'Enero',
  volunteers: 120,
  player: {
    name: 'Gabriel Silva',
    age: 25,
    profession: 'Abogado/a Constitucionalista',
    region: 'rm',
    district: 'Distrito 8',
    commune: 'Maipú',
    currentOffice: 'Ciudadano sin Cargo',
    officeId: '',
    officeEndYear: 0,
    partyId: 'IND',
    partyName: 'Independiente Fuera de Pacto',
    faction: 'Ciudadano Independiente',
    attributes: {
      oratory: 60,
      charisma: 55,
      negotiation: 50,
      management: 55
    },
    hours: 60,
    maxHours: 60,
    funds: 10000000,
    personalFunds: 2000000,
    politicalPoints: 25,
    nameRecognition: 25.0,
    approval: 52.0,
    corePolicies: ['p1', 'p4', 'p9'],
    activePactId: null,
    hiredStaffIds: []
  },
  socialTension: 35,
  macroMetrics: {
    inflation: 3.8,
    gdpGrowth: 2.3,
    unemployment: 8.5,
    victimizationRate: 58.0
  },
  congress: {
    activeChamber: 'diputados',
    lower: { ofic: 38, cv: 32, rep: 18, cent: 12 },
    upper: { ofic: 36, cv: 34, rep: 16, cent: 14 },
  },
  legislativeHistory: [
    { number: 'Archivo A1', title: 'Ley Marco de Ciberseguridad e Infraestructura Crítica', date: 'Enero 2024', type: 'Simple', quorum: '88 / 155', yes: 88, no: 52, abs: 15, area: 'crime', impact: 'Victimización -3.2%, Certeza jurídica +1.5%' },
    { number: 'Archivo A2', title: 'Ley de Alivio Tributario y Fomento a las PyMEs', date: 'Marzo 2024', type: 'Simple', quorum: '94 / 155', yes: 94, no: 41, abs: 20, area: 'taxes', impact: 'Crecimiento PIB +0.4%, Empleo formal +1.2%' }
  ],
  newsFeed: [
    { date: 'Semana 1, 2024', source: 'Crónica de la simulación', title: 'Comienza el calendario electoral simulado.' }
  ],
});
let GAME_STATE = initialState();

let p1AvailablePoints = 5;
let p1SelectedParty = 'IND';
let p1SelectedFaction = 'Ciudadano Independiente';
let p1Attributes = { oratory: 60, charisma: 55, negotiation: 50, management: 55 };
let p2SelectedPolicies = ['p1', 'p4', 'p9'];

window.adjustAttribute = function(attrKey, delta) {
  if (delta > 0 && p1AvailablePoints < delta) return;
  if (delta < 0 && p1Attributes[attrKey] <= 30) return;
  if (delta > 0 && p1Attributes[attrKey] >= 95) return;

  p1Attributes[attrKey] += delta;
  p1AvailablePoints -= delta;

  document.getElementById(`attr-${attrKey}-val`).textContent = p1Attributes[attrKey];
  document.getElementById(`attr-${attrKey}-bar`).style.width = `${p1Attributes[attrKey]}%`;
  document.getElementById('p1-points-pool-disp').textContent = `Puntos Disponibles: ${p1AvailablePoints}`;
};

window.p1HandleAgeChange = function(val) {
  const age = parseInt(val);
  document.getElementById('p1-age-disp').textContent = `${age} años`;
  const box = document.getElementById('p1-age-status-box');

  box.textContent = `Por edad: ${Object.values(OFFICES).filter(office => age >= office.age).map(office => office.name).join(', ')}.`;

  window.p1UpdateProfessions(age);
};

window.p1UpdateProfessions = function(age) {
  const sel = document.getElementById('p1-profession');
  sel.innerHTML = '';
  const list = age < 23
    ? ['Estudiante Universitario', 'Líder Estudiantil', 'Dirigente Vecinal', 'Emprendedor Joven', 'Activista Social', 'Feriante']
    : ['Abogado/a Constitucionalista', 'Ingeniero/a Comercial', 'Economista', 'Médico/a Salubrista', 'Profesor/a', 'Administrador/a Público/a', 'Periodista'];

  list.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    sel.appendChild(opt);
  });
};

window.p1RandomName = function() {
  const f = ['Gabriel', 'Tomás', 'Claudio', 'Rodrigo', 'Sebastián', 'Camila', 'Evelyn', 'Carolina', 'Macarena', 'Diego', 'Matías'];
  const l = ['Silva', 'Soto', 'Araya', 'Muñoz', 'Rojas', 'Sepúlveda', 'Torres', 'Fuentes', 'Vera', 'Contreras', 'Morales'];
  document.getElementById('p1-name').value = `${f[Math.floor(Math.random() * f.length)]} ${l[Math.floor(Math.random() * l.length)]}`;
};

window.p1RenderParties = function() {
  const grid = document.getElementById('p1-parties-grid');
  grid.innerHTML = '';

  CHILE_PARTIES.forEach(p => {
    const isSel = (p1SelectedParty === p.id);
    const c = document.createElement('div');
    c.className = `p-2.5 border-2 rounded text-xs cursor-pointer transition select-none flex flex-col justify-between ${isSel ? 'border-blue-700 bg-blue-50/80 font-bold shadow-xs' : 'border-stone-300 bg-white hover:border-stone-400'}`;
    c.innerHTML = `
      <div>
        <div class="flex items-center gap-1.5 mb-1">
          <span class="w-3 h-3 rounded-full shrink-0" style="background-color: ${p.color};"></span>
          <span class="font-extrabold text-slate-900">${p.id}</span>
        </div>
        <div class="text-[11px] text-stone-600 leading-snug">${p.name}</div>
      </div>
      <div class="mt-2 text-[10px] font-mono text-stone-500">${p.bloc}</div>
    `;
    c.onclick = () => {
      p1SelectedParty = p.id;
      p1SelectedFaction = null;
      document.getElementById('p1-selected-party-badge').textContent = `${p.id} - ${p.name}`;
      window.p1RenderParties();
      window.p1RenderFactions(p);
    };
    grid.appendChild(c);
  });
};

window.p1RenderFactions = function(party) {
  const grid = document.getElementById('p1-factions-grid');
  grid.innerHTML = '';
  const factions = party.factions || ['Sensibilidad Base'];
  if (!p1SelectedFaction || !factions.includes(p1SelectedFaction)) {
    p1SelectedFaction = factions[0];
  }
  document.getElementById('p1-faction-badge').textContent = p1SelectedFaction;

  factions.forEach(f => {
    const isSel = (p1SelectedFaction === f);
    const c = document.createElement('div');
    c.className = `p-2.5 border-2 rounded cursor-pointer text-xs transition select-none ${isSel ? 'bg-blue-100 border-blue-600 font-bold text-blue-950 shadow-xs ring-1 ring-blue-500' : 'bg-white border-stone-300 hover:border-stone-400 hover:bg-stone-50'}`;
    c.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-base">${isSel ? '✅' : '🚩'}</span>
        <div>
          <strong class="block text-slate-900">${f}</strong>
          <span class="text-[10px] text-stone-500 font-normal">${party.id === 'IND' ? 'Trayectoria independiente' : `Corriente interna en ${party.id}`}</span>
        </div>
      </div>
    `;
    c.onclick = () => {
      p1SelectedFaction = f;
      document.getElementById('p1-faction-badge').textContent = f;
      window.p1RenderFactions(party);
    };
    grid.appendChild(c);
  });
};

// Navegación entre Página 1 y Página 2
window.goToPage2Territory = function() {
  const name = document.getElementById('p1-name').value.trim();
  const alertEl = document.getElementById('p1-validation-alert');
  if (name.length < 3) {
    alertEl.textContent = '⚠️ Debes ingresar un nombre y apellido de al menos 3 caracteres.';
    alertEl.classList.remove('hidden');
    return;
  }
  alertEl.classList.add('hidden');

  // Inicializar cascada de la página 2
  if (element('p2-region').options.length <= 1) window.p2InitTerritoryCascades();
  const startOffice = element('p2-initial-office');
  const previous = startOffice.value;
  const age = Number(element('p1-age').value);
  startOffice.replaceChildren(new Option('Ciudadano sin cargo', 'none'), ...Object.entries(OFFICES)
    .filter(([, office]) => age >= office.age)
    .map(([id, office]) => new Option(`${office.name} (${office.age}+)`, id)));
  if ([...startOffice.options].some(option => option.value === previous)) startOffice.value = previous;
  window.p2HandleYearChange(element('p2-start-year').value);
  window.p2RenderPoliciesCatalog();

  document.getElementById('screen-page-1-identity').classList.add('hidden');
  document.getElementById('screen-page-2-territory').classList.remove('hidden');
};

window.backToPage1Identity = function() {
  document.getElementById('screen-page-2-territory').classList.add('hidden');
  document.getElementById('screen-page-1-identity').classList.remove('hidden');
};

window.p2HandleYearChange = function(yearVal) {
  const year = Number(yearVal);
  const week = electionWeek(year);
  element('p2-year-description').textContent = week
    ? `${year}: ${year % 4 === 0 ? 'elecciones municipales y regionales' : 'elecciones presidenciales y parlamentarias'}. Inscripción desde la semana ${registrationWeek}; votación en la semana ${week}.`
    : `${year}: año sin elecciones regulares. El calendario avanza con la partida.`;
};

window.p2InitTerritoryCascades = function() {
  const regSelect = document.getElementById('p2-region');
  regSelect.innerHTML = '<option value="" disabled selected>-- Selecciona una Región --</option>';

  for (const regKey in CHILE_GEO) {
    const opt = document.createElement('option');
    opt.value = regKey;
    opt.textContent = CHILE_GEO[regKey].name;
    regSelect.appendChild(opt);
  }

  const distSelect = document.getElementById('p2-district');
  distSelect.innerHTML = '<option value="" disabled selected>-- Primero selecciona una región --</option>';
  distSelect.disabled = true;
  distSelect.className = 'w-full p-2 border border-stone-300 bg-stone-100 rounded text-xs font-bold text-slate-800 cursor-pointer';

  const commSelect = document.getElementById('p2-commune');
  commSelect.innerHTML = '<option value="" disabled selected>-- Primero selecciona un distrito --</option>';
  commSelect.disabled = true;
  commSelect.className = 'w-full p-2 border border-stone-300 bg-stone-100 rounded text-xs font-bold text-slate-800 cursor-pointer';

  document.getElementById('p2-preview-domicile').innerHTML = '<span class="text-amber-800 italic">Sin territorio asignado (Elige Región, Distrito y Comuna)</span>';
};

window.p2HandleRegionChange = function(regKey) {
  const distSelect = document.getElementById('p2-district');
  distSelect.innerHTML = '<option value="" disabled selected>-- Selecciona un Distrito --</option>';
  distSelect.disabled = false;
  distSelect.className = 'w-full p-2 border border-stone-400 bg-white rounded text-xs font-bold text-slate-800 cursor-pointer';

  const districts = CHILE_GEO[regKey]?.districts || {};
  for (const distKey in districts) {
    const opt = document.createElement('option');
    opt.value = distKey;
    opt.textContent = `${distKey} (${districts[distKey].seats} Escaños)`;
    distSelect.appendChild(opt);
  }

  const commSelect = document.getElementById('p2-commune');
  commSelect.innerHTML = '<option value="" disabled selected>-- Primero selecciona un distrito --</option>';
  commSelect.disabled = true;
  commSelect.className = 'w-full p-2 border border-stone-300 bg-stone-100 rounded text-xs font-bold text-slate-800 cursor-pointer';

  document.getElementById('p2-preview-domicile').innerHTML = `<span class="text-stone-700">${CHILE_GEO[regKey]?.name} (Selecciona Distrito y Comuna)</span>`;
};

window.p2HandleDistrictChange = function(distKey) {
  const regKey = document.getElementById('p2-region').value;
  const commSelect = document.getElementById('p2-commune');
  commSelect.innerHTML = '<option value="" disabled selected>-- Selecciona una Comuna --</option>';
  commSelect.disabled = false;
  commSelect.className = 'w-full p-2 border border-stone-400 bg-white rounded text-xs font-bold text-slate-800 cursor-pointer';

  const cleanDistKey = distKey.split(' (')[0];
  const communes = CHILE_GEO[regKey]?.districts[cleanDistKey]?.communes || [];

  communes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    commSelect.appendChild(opt);
  });

  document.getElementById('p2-preview-domicile').innerHTML = `<span class="text-stone-700">${cleanDistKey} - Selecciona tu comuna de residencia</span>`;
};

window.p2HandleCommuneChange = function(commName) {
  const regKey = document.getElementById('p2-region').value;
  const distKey = document.getElementById('p2-district').value.split(' (')[0];
  document.getElementById('p2-preview-domicile').innerHTML = `<strong class="text-blue-900">${commName}</strong> (${distKey}, ${CHILE_GEO[regKey]?.name})`;
};

window.p2RenderPoliciesCatalog = function() {
  const topic = element('p2-policy-topic').value;
  const renderPolicy = policy => {
    const checked = p2SelectedPolicies.includes(policy.id);
    const row = document.createElement('label');
    row.className = `flex items-center gap-2 p-2 border rounded text-xs ${checked ? 'bg-blue-50 border-blue-400' : 'bg-white border-stone-200'}`;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.disabled = !checked && p2SelectedPolicies.length === 3;
    input.addEventListener('change', () => window.p2TogglePolicy(policy.id));
    row.append(input, policy.name);
    return row;
  };
  element('p2-policies-catalog').replaceChildren(...POLICIES_CATALOG.filter(policy => !topic || policy.issue === topic).map(renderPolicy));
  element('p2-policies-count-badge').textContent = `${p2SelectedPolicies.length} / 3 Seleccionadas`;
  const selections = p2SelectedPolicies.map(id => POLICIES_CATALOG.find(policy => policy.id === id)).filter(Boolean);
  element('p2-selected-policies').replaceChildren(...selections.map(policy => {
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'p-1 border rounded bg-blue-50 text-xs';
    remove.textContent = `${policy.name} ×`;
    remove.setAttribute('aria-label', `Quitar ${policy.name}`);
    remove.onclick = () => window.p2TogglePolicy(policy.id);
    return remove;
  }));
  updateCompass('p2', p2SelectedPolicies);
};

function updateCompass(prefix, ids) {
  const position = programPosition(ids);
  const dot = element(`${prefix}-compass-dot`);
  dot.style.left = `${position.x}%`;
  dot.style.top = `${position.y}%`;
  dot.style.transform = 'translate(-50%, -50%)';
  element(`${prefix}-ideology-summary-text`).textContent = position.label;
}

window.p2TogglePolicy = function(pid) {
  if (p2SelectedPolicies.includes(pid)) p2SelectedPolicies = p2SelectedPolicies.filter(id => id !== pid);
  else if (p2SelectedPolicies.length < 3 && POLICIES_CATALOG.some(policy => policy.id === pid)) p2SelectedPolicies.push(pid);
  window.p2RenderPoliciesCatalog();
};

function initPrograms() {
  for (const issue of new Set(POLICIES_CATALOG.map(policy => policy.issue))) {
    element('p2-policy-topic').add(new Option(issue, issue));
  }
  for (const preset of PROGRAM_PRESETS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'p-1 border rounded bg-stone-100 hover:bg-blue-50 text-xs';
    button.textContent = preset.label;
    button.addEventListener('click', () => {
      p2SelectedPolicies = [...preset.ids];
      element('p2-policy-topic').value = '';
      window.p2RenderPoliciesCatalog();
    });
    element('p2-presets-container').appendChild(button);
  }
}

window.finishFullCharacterCreation = function() {
  const alertEl = document.getElementById('p2-validation-alert');

  const reg = document.getElementById('p2-region').value;
  const distVal = document.getElementById('p2-district').value;
  const comm = document.getElementById('p2-commune').value;

  const district = distVal.split(' (')[0];
  if (!CHILE_GEO[reg]?.districts[district]?.communes.includes(comm)) {
    alertEl.textContent = '⚠️ Debes seleccionar libremente tu Región, Distrito y Comuna de residencia antes de iniciar.';
    alertEl.classList.remove('hidden');
    return;
  }

  if (p2SelectedPolicies.length !== 3) {
    alertEl.textContent = '⚠️ Debes elegir exactamente 3 políticas prioritarias.';
    alertEl.classList.remove('hidden');
    return;
  }

  const age = Number(document.getElementById('p1-age').value);
  if (!Number.isInteger(age) || age < 18 || age > 85) {
    alertEl.textContent = 'Selecciona una edad entre 18 y 85 años.';
    alertEl.classList.remove('hidden');
    return;
  }
  const officeVal = document.getElementById('p2-initial-office').value;

  if (officeVal !== 'none' && (!Object.hasOwn(OFFICES, officeVal) || age < OFFICES[officeVal].age)) {
    alertEl.textContent = 'No cumples la edad mínima de ese cargo.';
    alertEl.classList.remove('hidden');
    return;
  }

  const dist = district;
  const name = document.getElementById('p1-name').value.trim();
  const profession = document.getElementById('p1-profession').value;
  const startYear = parseInt(document.getElementById('p2-start-year')?.value || '2024');

  const partyObj = CHILE_PARTIES.find(p => p.id === p1SelectedParty) || { name: 'Independiente' };

  GAME_STATE = initialState();
  GAME_STATE.year = startYear;
  GAME_STATE.roster = newRoster(startYear);
  GAME_STATE.week = 1;
  GAME_STATE.month = 'Enero';
  GAME_STATE.volunteers = 120;
  GAME_STATE.player.name = name;
  GAME_STATE.player.age = age;
  GAME_STATE.player.profession = profession;
  if (/Dirigente|Líder|Activista/.test(profession)) {
    GAME_STATE.player.nameRecognition += 8;
    GAME_STATE.volunteers += 25;
  } else if (/Economista|Comercial|Emprendedor/.test(profession)) GAME_STATE.player.personalFunds += 1_000_000;
  else GAME_STATE.player.politicalPoints += 3;
  GAME_STATE.player.region = reg;
  GAME_STATE.player.district = dist;
  GAME_STATE.player.commune = comm;
  GAME_STATE.player.partyId = p1SelectedParty;
  GAME_STATE.player.partyName = partyObj.name;
  GAME_STATE.player.faction = p1SelectedFaction;
  GAME_STATE.player.attributes = { ...p1Attributes };
  GAME_STATE.player.officeId = officeVal === 'none' ? '' : officeVal;
  GAME_STATE.player.currentOffice = officeTitle(GAME_STATE.player.officeId, GAME_STATE.player);
  if (GAME_STATE.player.officeId) {
    openMandate(GAME_STATE);
    GAME_STATE.localManagement = 'pending';
  }
  recordCareer(GAME_STATE, 'Inicio', `Comienza la trayectoria como ${GAME_STATE.player.currentOffice}.`);
  GAME_STATE.player.corePolicies = [...p2SelectedPolicies];

  // Ocultar pantallas de creación y abrir tablero
  document.getElementById('screen-page-1-identity').classList.add('hidden');
  document.getElementById('screen-page-2-territory').classList.add('hidden');

  window.showToast('¡Bienvenido al Juego!', `Inicias tu carrera en ${comm} (${dist}) en el año ${startYear}.`, 'success');
  window.renderAll();
};

let d3SimShares = { ofic: 38, cv: 32, rep: 18, cent: 12 };

window.resetDHondtSliders = function() {
  d3SimShares = { ofic: 38, cv: 32, rep: 18, cent: 12 };
  document.getElementById('dh-slider-ofic').value = 38;
  document.getElementById('dh-slider-cv').value = 32;
  document.getElementById('dh-slider-rep').value = 18;
  document.getElementById('dh-slider-cent').value = 12;
  window.updateDHondtSimulation();
};

window.updateDHondtSimulation = function() {
  d3SimShares.ofic = parseInt(document.getElementById('dh-slider-ofic').value);
  d3SimShares.cv = parseInt(document.getElementById('dh-slider-cv').value);
  d3SimShares.rep = parseInt(document.getElementById('dh-slider-rep').value);
  d3SimShares.cent = parseInt(document.getElementById('dh-slider-cent').value);

  document.getElementById('dh-pct-ofic').textContent = `${d3SimShares.ofic}%`;
  document.getElementById('dh-pct-cv').textContent = `${d3SimShares.cv}%`;
  document.getElementById('dh-pct-rep').textContent = `${d3SimShares.rep}%`;
  document.getElementById('dh-pct-cent').textContent = `${d3SimShares.cent}%`;

  window.renderDHondtD3Visualization();
};

window.renderDHondtD3Visualization = function() {
  const container = document.getElementById('d3-dhondt-hemicircle');
  if (!container) return;
  container.innerHTML = '';

  const distKey = GAME_STATE.player.district || 'Distrito 8';
  const regKey = GAME_STATE.player.region || 'rm';
  const totalSeats = CHILE_GEO[regKey]?.districts[distKey]?.seats || 8;

  document.getElementById('dhondt-sim-district-header').textContent =
    `Simulador D'Hondt con D3.js: Distribución de Escaños en ${distKey} (${totalSeats} Escaños en Disputa)`;

  // Total votos del distrito (base 300.000)
  const totalVotes = 300000;
  const sumShares = d3SimShares.ofic + d3SimShares.cv + d3SimShares.rep + d3SimShares.cent;

  if (!sumShares) {
    for (const id of Object.keys(d3SimShares)) document.getElementById(`dh-seats-${id}`).textContent = '0 Escaños';
    document.getElementById('dhondt-cifra-repartidora-disp').textContent = 'Ingresa votos para repartir escaños.';
    return;
  }
  const lists = PACTS.map(list => ({
    ...list, votes: Math.round(totalVotes * d3SimShares[list.id] / sumShares),
  }));

  const winningQuotients = allocateSeats(lists, totalSeats);
  const lastWinning = winningQuotients.at(-1);
  lists.forEach(list => {
    document.getElementById(`dh-seats-${list.id}`).textContent = `${list.seats} Escaños`;
  });

  document.getElementById('dhondt-cifra-repartidora-disp').textContent =
    `Cifra Repartidora de Corte: ${lastWinning ? lastWinning.quotient.toLocaleString('es-CL') : '0'} Votos`;

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 280 150');
  svg.setAttribute('class', 'w-full h-full');
  winningQuotients.forEach((seat, index) => {
    const theta = Math.PI * (1 - index / Math.max(1, totalSeats - 1));
    const circle = document.createElementNS(ns, 'circle');
    circle.setAttribute('cx', 140 - 110 * Math.cos(theta));
    circle.setAttribute('cy', 135 - 110 * Math.sin(theta));
    circle.setAttribute('r', 11);
    circle.setAttribute('fill', seat.color);
    svg.append(circle);
  });
  container.append(svg);
};

let currentStaffRoleFilter = 'all';

window.filterStaffRole = function(role) {
  currentStaffRoleFilter = role;
  document.querySelectorAll('.staff-role-filter').forEach(btn => {
    btn.className = 'staff-role-filter px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs cursor-pointer';
  });
  const activeBtn = document.getElementById(`staff-tab-${role}`);
  if (activeBtn) {
    activeBtn.className = 'staff-role-filter px-2.5 py-1 rounded bg-[#0047AB] text-white font-bold text-xs cursor-pointer';
  }
  window.renderStaffPanel();
};

function staffTotals() {
  const totals = {
    salaryWeekly: 0, bonusHours: 0, bonusRecogWeekly: 0, bonusVolunteersWeekly: 0, bonusPPMonthly: 0,
    fundraisingBonus: 0, pollAccuracy: 0, advertisingBonus: 0, territorialDiscount: 0, registrationDiscount: 0,
  };
  for (const staff of STAFF_CATALOG) {
    if (GAME_STATE.player.hiredStaffIds.includes(staff.id)) {
      for (const key of Object.keys(totals)) totals[key] += staff[key] || 0;
    }
  }
  return totals;
}

function registrationCost() {
  return Math.round(LOCAL_REGISTRATION.funds * (1 - staffTotals().registrationDiscount));
}

function updateStaffHours() {
  const player = GAME_STATE.player;
  player.maxHours = 60 + staffTotals().bonusHours;
  player.hours = Math.min(player.hours, player.maxHours);
}

window.hireStaff = function(staffId) {
  const staff = STAFF_CATALOG.find(s => s.id === staffId);
  if (!staff) return;

  const player = GAME_STATE.player;
  const existing = STAFF_CATALOG.find(item => item.role === staff.role && player.hiredStaffIds.includes(item.id));
  if (existing?.id === staff.id) return;
  const payroll = staffTotals().salaryWeekly - (existing?.salaryWeekly || 0) + staff.salaryWeekly;
  if (player.funds < payroll) return warn(`La planilla completa costaría ${clp(payroll)} por semana.`);
  if (existing) player.hiredStaffIds = player.hiredStaffIds.filter(id => id !== existing.id);

  if (!GAME_STATE.player.hiredStaffIds.includes(staff.id)) {
    GAME_STATE.player.hiredStaffIds.push(staff.id);
  }

  // Recalcular horas máximas
  updateStaffHours();

  const change = existing ? ` Reemplaza a ${existing.name}.` : '';
  window.showToast('Asesor incorporado', `${staff.name} se sumó al comando como ${staff.roleLabel}.${change}`, 'success');
  refreshCampaign();
  window.renderStaffPanel();
};

window.fireStaff = function(staffId) {
  const staff = STAFF_CATALOG.find(s => s.id === staffId);
  if (!staff) return;

  GAME_STATE.player.hiredStaffIds = (GAME_STATE.player.hiredStaffIds || []).filter(id => id !== staffId);

  // Recalcular horas máximas
  updateStaffHours();

  window.showToast('Contrato Concluido', `Has desvinculado a ${staff.name} del comando de campaña.`, 'info');
  refreshCampaign();
  window.renderStaffPanel();
};

window.renderStaffPanel = function() {
  const container = document.getElementById('staff-hire-container');
  if (!container) return;
  container.innerHTML = '';

  const hiredIds = GAME_STATE.player.hiredStaffIds || [];

  // Actualizar métricas del dashboard superior
  const { salaryWeekly: totalPayroll, bonusHours: totalBonusHours, bonusRecogWeekly: totalBonusRecog, bonusVolunteersWeekly: totalBonusVolunteers } = staffTotals();

  const badgeEl = document.getElementById('staff-summary-badge');
  if (badgeEl) badgeEl.textContent = `${hiredIds.length} / 4 Cargos Cubiertos`;

  const pEl = document.getElementById('staff-metric-payroll');
  if (pEl) pEl.textContent = `$${totalPayroll.toLocaleString('es-CL')} CLP / sem`;

  const hEl = document.getElementById('staff-metric-hours');
  if (hEl) hEl.textContent = `+${totalBonusHours} hrs / sem (${60 + totalBonusHours} hrs tot)`;

  const rEl = document.getElementById('staff-metric-recog');
  if (rEl) rEl.textContent = `+${totalBonusRecog.toFixed(1)}% / sem`;

  const vEl = document.getElementById('staff-metric-volunteers');
  if (vEl) vEl.textContent = `+${totalBonusVolunteers} brigadistas / sem`;

  // Filtrar catálogo según la categoría seleccionada
  const visibleStaff = (currentStaffRoleFilter === 'all')
    ? STAFF_CATALOG
    : STAFF_CATALOG.filter(s => s.role === currentStaffRoleFilter);

  visibleStaff.forEach(staff => {
    const isHired = hiredIds.includes(staff.id);
    const card = document.createElement('div');
    card.className = `p-3.5 border-2 rounded shadow-2xs flex flex-col justify-between transition ${isHired ? 'bg-emerald-50/70 border-emerald-500' : 'bg-white border-stone-300 hover:border-stone-400'}`;

    card.innerHTML = `
      <div class="space-y-2">
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-2">
            <span class="text-2xl">${staff.avatar}</span>
            <div>
              <h4 class="font-extrabold text-xs text-slate-900">${staff.name}</h4>
              <span class="text-[10px] font-mono font-bold text-stone-600 block">${staff.roleIcon} ${staff.roleLabel}</span>
            </div>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isHired ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700 border border-stone-300'}">
            ${isHired ? '✓ CONTRATADO' : 'DISPONIBLE'}
          </span>
        </div>

        <div>
          <strong class="text-[11px] text-blue-950 block">${staff.title}</strong>
          <p class="text-[11px] text-stone-600 leading-snug">${staff.exp}</p>
        </div>

        <div class="p-2 bg-stone-50 rounded border border-stone-200 text-xs font-mono space-y-1">
          <div class="flex justify-between">
            <span class="text-stone-500 font-sans text-[11px]">Sueldo Semanal:</span>
            <strong class="text-slate-900 font-mono-num font-bold">$${staff.salaryWeekly.toLocaleString('es-CL')} CLP</strong>
          </div>
          <div class="text-[11px] font-sans font-bold text-emerald-800">
            🎁 Bonos: <span class="font-normal font-sans text-slate-800">${staff.perkDesc}</span>
          </div>
        </div>
      </div>

      <div class="pt-3 border-t mt-3 flex justify-end">
        ${isHired ? `
          <button onclick="window.fireStaff('${staff.id}')" class="w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-xs rounded cursor-pointer transition">
            ✕ Desvincular del Comando
          </button>
        ` : `
          <button onclick="window.hireStaff('${staff.id}')" class="w-full py-1.5 bg-[#0047AB] hover:bg-[#003399] active:bg-[#002277] text-white font-bold text-xs rounded shadow-2xs cursor-pointer transition flex items-center justify-center gap-1.5">
            <span>Contratar por $${staff.salaryWeekly.toLocaleString('es-CL')}/sem</span>
          </button>
        `}
      </div>
    `;

    container.appendChild(card);
  });
};

window.advanceTurn = function(weeksToAdvance = 1) {
  const count = [1, 4].includes(weeksToAdvance) ? weeksToAdvance : 1;
  const previousAgenda = publicAgenda(GAME_STATE);
  let announced = false;
  let payrollWarning = false;
  for (let w = 0; w < count; w++) {
    GAME_STATE.week += 1;

    if (GAME_STATE.week > 52) {
      GAME_STATE.week = 1;
      GAME_STATE.year += 1;
      GAME_STATE.player.age += 1;
      renewRoster(GAME_STATE);
      GAME_STATE.newsFeed.unshift({ date: `Enero ${GAME_STATE.year}`, source: 'Crónica de la simulación',
        title: `Comienza el año político. Agenda pública: ${publicAgenda(GAME_STATE).title}.` });
      GAME_STATE.newsFeed.length = Math.min(36, GAME_STATE.newsFeed.length);
      if (GAME_STATE.player.age >= RETIREMENT_AGE) retire();
      window.renderPoliticiansDirectory();
      window.showToast('¡Año Nuevo Constitucional!', `Comienza el año ${GAME_STATE.year}. Tienes ${GAME_STATE.player.age} años cumplidos.`, 'success');
    }

    const player = GAME_STATE.player;
    const payroll = staffTotals().salaryWeekly;
    if (payroll > player.funds) {
      player.hiredStaffIds = [];
      payrollWarning = true;
      window.showToast('Equipo desvinculado', 'El presupuesto no alcanza para pagar la planilla.', 'warning');
    } else {
      player.funds -= payroll;
    }
    const bonuses = staffTotals();
    player.hours = player.maxHours = 60 + bonuses.bonusHours;
    player.nameRecognition = Math.max(8, Math.min(100, player.nameRecognition + bonuses.bonusRecogWeekly - 0.15));
    GAME_STATE.volunteers = Math.min(VOLUNTEER_LIMIT, GAME_STATE.volunteers + bonuses.bonusVolunteersWeekly);
    weeklyCampaign(GAME_STATE);
    if (completeProject(GAME_STATE)) window.showToast('Proyecto ejecutado', 'Consulta el efecto en Cargo e Historial.', 'success');
    if (GAME_STATE.week % 4 === 0 && GAME_STATE.mandate && !GAME_STATE.mandate.project && player.approval > 52) {
      player.approval = Math.max(52, player.approval - 0.35);
    }
    if (GAME_STATE.localElection?.year === GAME_STATE.year) decayMessages(GAME_STATE.localElection);
    if (GAME_STATE.week % 4 === 0) player.politicalPoints += bonuses.bonusPPMonthly;

    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const mIdx = Math.min(11, Math.floor((GAME_STATE.week - 1) / 4.33));
    GAME_STATE.month = months[mIdx];
    const votingWeek = electionWeek(GAME_STATE.year);
    const runoffWeek = GAME_STATE.localElection?.year === GAME_STATE.year ? GAME_STATE.localElection.runoffWeek : 0;
    if (votingWeek && [registrationWeek, votingWeek, runoffWeek].includes(GAME_STATE.week)) {
      if (GAME_STATE.week === votingWeek || GAME_STATE.week === runoffWeek) {
        resolveElection();
        if (GAME_STATE.localElection.result) window.showToast('Escrutinio electoral', 'El resultado está disponible en Elecciones.', 'info');
        else window.showToast('Segunda vuelta', GAME_STATE.localElection.firstRound, 'info');
        window.renderPoliticiansDirectory();
      } else window.showToast('Inscripciones abiertas', 'Elige un cargo en Elecciones para iniciar tu campaña.', 'info');
      window.switchMainView('view-elections');
      announced = true;
      break;
    }
    if (payrollWarning) break;
  }

  const agenda = publicAgenda(GAME_STATE);
  if (!announced && !payrollWarning && agenda !== previousAgenda) window.showToast('Cambió la agenda pública', `${agenda.title}. Revisa el efecto en tus tres ejes.`);
  refreshCampaign();
  renderCountry(GAME_STATE);
  window.renderPublicOpinionTable();
  window.renderStaffPanel();
};

function renderPlayerStats() {
  document.getElementById('stat-player-name').textContent = `${GAME_STATE.player.name || 'Sin Nombre'} (${GAME_STATE.player.age} años)`;
  document.getElementById('stat-player-party').textContent = GAME_STATE.player.partyId;
  document.getElementById('stat-player-office').textContent = GAME_STATE.player.currentOffice;
  document.getElementById('stat-pp').textContent = `${GAME_STATE.player.politicalPoints} PP`;
  document.getElementById('clock-date-disp').textContent = `Semana ${GAME_STATE.week} / 52, ${GAME_STATE.month} ${GAME_STATE.year}`;
  document.getElementById('card-funds-disp').textContent = `$${GAME_STATE.player.funds.toLocaleString('es-CL')}`;
  document.getElementById('card-hours-disp').textContent = `${GAME_STATE.player.hours} / ${GAME_STATE.player.maxHours} hrs`;
  document.getElementById('card-recognition-disp').textContent = `${GAME_STATE.player.nameRecognition.toFixed(1)}%`;

  const finFunds = document.getElementById('finance-total-funds');
  if (finFunds) finFunds.textContent = `$${GAME_STATE.player.funds.toLocaleString('es-CL')}`;

  const badgeEl = document.getElementById('clock-election-badge');
  if (badgeEl) {
    const { year, week } = GAME_STATE;
    const vote = electionWeek(year);
    badgeEl.textContent = !vote ? 'Año sin elección regular'
      : week >= vote ? `Resultados electorales ${year}` : `Elecciones · semana ${vote}, ${year}`;
  }

  const domDisp = document.getElementById('profile-domicile-disp');
  if (domDisp) {
    domDisp.textContent = `Domicilio Electoral: ${GAME_STATE.player.commune || 'Sin definir'} (${GAME_STATE.player.district || 'Sin distrito'})`;
  }

  const player = GAME_STATE.player;
  renderMapFocus();
  element('donor-outlook').textContent = `Próxima cena: ${clp(fundraisingYield(GAME_STATE, staffTotals().fundraisingBonus))} · fatiga ${GAME_STATE.campaign.donorFatigue}/8`;
  element('personal-funds').textContent = `Ahorros: ${clp(player.personalFunds)}`;
  element('stat-approval').textContent = element('office-approval-disp').textContent = `${player.approval.toFixed(1)}%`;
  element('office-title-disp').textContent = player.currentOffice;
  element('office-status-subtitle').textContent = player.officeEndYear ? `Próxima renovación: ${player.officeEndYear}` : '';
}

window.renderAll = function() {
  renderPlayerStats();
  window.renderStaffPanel();
  window.renderContiguousMap();
  window.renderPublicOpinionTable();
  window.renderNewsFeed();
  window.renderCongressHemiciclo();
  window.renderLegislativeHistory();
  window.renderPoliticiansDirectory();
  window.renderElectoralPactsCatalog();
  window.renderDHondtD3Visualization();
  window.renderProfileAttributes();
  updateCompass('profile', GAME_STATE.player.corePolicies);
  renderCareer();
  renderLocalElection();
  renderCampaign(GAME_STATE, activeElection());
  renderCountry(GAME_STATE);
};

window.renderProfileAttributes = function() {
  const list = document.getElementById('profile-attributes-list');
  if (!list) return;
  const attrs = GAME_STATE.player.attributes || { oratory: 60, charisma: 55, negotiation: 50, management: 55 };
  list.innerHTML = `
    <div class="flex justify-between p-1 bg-white border rounded"><span>🎙️ Oratoria y Debate:</span><strong>${attrs.oratory}/100</strong></div>
    <div class="flex justify-between p-1 bg-white border rounded"><span>✨ Carisma Popular:</span><strong>${attrs.charisma}/100</strong></div>
    <div class="flex justify-between p-1 bg-white border rounded"><span>🤝 Negociación Política:</span><strong>${attrs.negotiation}/100</strong></div>
    <div class="flex justify-between p-1 bg-white border rounded"><span>📊 Capacidad de Gestión:</span><strong>${attrs.management}/100</strong></div>
    <div class="flex justify-between p-1 bg-blue-50 border border-blue-200 rounded text-blue-900"><span>🚩 Facción Interna:</span><strong><span id="profile-faction"></span></strong></div>
  `;
  document.getElementById('profile-faction').textContent = GAME_STATE.player.faction;
};

function renderMapFocus() {
  const selected = element('svg-contiguous-map').children[GAME_STATE.campaign.focus];
  element('map-sector-inspected').textContent = selected
    ? `${selected.getAttribute('aria-label')} · +${focusBonus(GAME_STATE)} % en puerta a puerta`
    : 'Elige un sector para el puerta a puerta';
}

window.renderContiguousMap = function() {
  const svg = document.getElementById('svg-contiguous-map');
  if (!svg) return;
  svg.innerHTML = '';

  const commune = GAME_STATE.player.commune;
  const district = GAME_STATE.player.district;
  const regName = CHILE_GEO[GAME_STATE.player.region]?.name || 'REGIÓN METROPOLITANA';

  document.getElementById('map-territory-title').textContent = `RESUMEN DE ${commune.toUpperCase()} (${district.toUpperCase()} - ${regName.toUpperCase()})`;

  const sectors = [
    { name: 'Centro Cívico y Plaza', path: 'M 200,100 L 280,100 L 290,150 L 210,150 Z', color: '#CBD5E1', pop: 48000 },
    { name: 'Norte Industrial', path: 'M 200,40 L 280,40 L 280,100 L 200,100 Z', color: '#E2E8F0', pop: 35000 },
    { name: 'Avenida Principal Poniente', path: 'M 120,80 L 200,100 L 210,150 L 130,140 Z', color: '#CBD5E1', pop: 52000 },
    { name: 'Sector Histórico y Templo', path: 'M 210,150 L 290,150 L 280,210 L 200,200 Z', color: '#94A3B8', pop: 44000 },
    { name: 'Oriente Residencial', path: 'M 280,100 L 360,90 L 370,160 L 290,150 Z', color: '#E2E8F0', pop: 61000 },
    { name: 'Sur Cordillera / Agrícola', path: 'M 200,200 L 280,210 L 270,270 L 190,260 Z', color: '#CBD5E1', pop: 38000 },
    { name: 'Barrio Estación y Comercio', path: 'M 130,140 L 210,150 L 200,200 L 120,190 Z', color: '#E2E8F0', pop: 49000 },
    { name: 'Sector Satélite Sur', path: 'M 120,190 L 200,200 L 190,260 L 110,250 Z', color: '#94A3B8', pop: 42000 }
  ];

  element('map-sector-inspected').textContent = 'Elige un sector para el puerta a puerta';
  sectors.forEach((s, index) => {
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    poly.setAttribute('d', s.path);
    poly.setAttribute('fill', s.color);
    poly.setAttribute('stroke', '#475569');
    poly.setAttribute('stroke-width', '1.5');
    poly.setAttribute('class', 'hover:fill-blue-500 transition-colors duration-150 cursor-pointer');
    poly.setAttribute('tabindex', '0');
    poly.setAttribute('role', 'button');
    poly.setAttribute('aria-label', s.name);

    poly.onmouseover = () => {
      const tip = document.getElementById('map-hover-tooltip');
      tip.innerHTML = `<strong>${s.name}</strong><br>Población simulada: ${s.pop.toLocaleString('es-CL')} electores`;
      tip.classList.remove('hidden');
    };
    poly.onmouseout = () => {
      document.getElementById('map-hover-tooltip').classList.add('hidden');
    };
    poly.onclick = () => {
      GAME_STATE.campaign.focus = index;
      renderMapFocus();
      window.showToast('Barrio seleccionado', `El puerta a puerta se concentra en ${s.name}.`, 'info');
    };

    poly.onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        poly.onclick();
      }
    };
    svg.appendChild(poly);
  });
  renderMapFocus();
};

window.renderPublicOpinionTable = function() {
  const tbody = document.getElementById('public-opinion-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const issues = [...new Set(POLICIES_CATALOG.map(policy => policy.issue))]
    .map(name => ({ name, imp: Math.round(policyUrgency(GAME_STATE, name) * 100) }))
    .sort((a, b) => b.imp - a.imp).slice(0, 5)
    .map(issue => ({ ...issue, val: (issue.imp - 50) / 10 }));
  const groups = campaignClimate(GAME_STATE).groups;
  const shares = { left: groups[0].weight, center: groups[1].weight, right: groups[2].weight };
  for (const [id, share] of Object.entries(shares)) {
    const value = Math.round(share * 100);
    element(`enth-${id}-val`).textContent = `${value}%`;
    element(`enth-${id}-bar`).style.width = `${value}%`;
  }

  issues.forEach(i => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-stone-50 text-xs';
    tr.innerHTML = `
      <td class="py-1 px-2 font-bold text-slate-900">${i.name}</td>
      <td class="py-1 px-2 text-center text-stone-600">${i.imp}%</td>
      <td class="py-1 px-2">
        <div class="w-full bg-stone-200 h-2.5 rounded overflow-hidden">
          <div class="h-full ${i.val >= 0 ? 'bg-blue-600' : 'bg-rose-600'}" style="width: ${Math.min(100, Math.abs(i.val) * 10)}%;"></div>
        </div>
      </td>
      <td class="py-1 px-2 text-right font-mono font-bold ${i.val >= 0 ? 'text-blue-800' : 'text-rose-700'}">
        ${i.val > 0 ? '+' : ''}${i.val.toFixed(1)}%
      </td>
    `;
    tbody.appendChild(tr);
  });
};

window.renderNewsFeed = function() {
  const cont = document.getElementById('news-feed-container');
  if (!cont) return;
  cont.innerHTML = '';

  GAME_STATE.newsFeed.forEach(n => {
    const item = document.createElement('div');
    item.className = 'p-2.5 border border-stone-300 bg-white rounded text-xs space-y-0.5';
    item.innerHTML = `
      <div class="flex justify-between text-[10px] text-stone-500 font-mono">
        <span>${escapeHtml(n.source)}</span>
        <span>${escapeHtml(n.date)}</span>
      </div>
      <div class="font-bold text-slate-900 text-xs">${escapeHtml(n.title)}</div>
    `;
    cont.appendChild(item);
  });
};

window.setCongressChamber = function(chamber) {
  GAME_STATE.congress.activeChamber = chamber;
  for (const [id, key] of [['dip', 'diputados'], ['sen', 'senado']]) {
    const button = element(`btn-cong-camara-${id}`);
    button.classList.toggle('bg-[#0047AB]', key === chamber);
    button.classList.toggle('text-white', key === chamber);
  }
  window.renderCongressHemiciclo();
};

function updateCongress(climate) {
  const { congress } = GAME_STATE;
  const preferences = climate.groups.map(group => group.weight * 100);
  const targets = [preferences[0], preferences[1] * 0.58, preferences[2], preferences[1] * 0.42];
  PACTS.forEach((pact, index) => {
    congress.lower[pact.id] = targets[index];
    congress.upper[pact.id] = (congress.upper[pact.id] + targets[index]) / 2;
  });
}

window.renderCongressHemiciclo = function() {
  const svg = document.getElementById('svg-congress-hemiciclo');
  if (!svg) return;
  svg.innerHTML = '';

  const isDip = (GAME_STATE.congress.activeChamber === 'diputados');
  const total = isDip ? 155 : 50;
  element('cong-quorum-simple-disp').textContent = `${Math.floor(total / 2) + 1} votos`;
  element('cong-quorum-47-disp').textContent = `${Math.ceil(total * 4 / 7)} votos`;
  element('cong-player-seat-disp').textContent = GAME_STATE.player.officeId === (isDip ? 'diputado' : 'senador')
    ? GAME_STATE.player.currentOffice : 'Sin escaño en esta cámara';
  for (const [id, active] of [['dip', isDip], ['sen', !isDip]]) {
    element(`btn-cong-camara-${id}`).classList.toggle('bg-[#0047AB]', active);
    element(`btn-cong-camara-${id}`).classList.toggle('text-white', active);
  }
  const cx = 320, cy = 280;
  const rows = isDip ? [
    { r: 130, count: 32 }, { r: 165, count: 38 }, { r: 200, count: 41 }, { r: 235, count: 44 }
  ] : [
    { r: 140, count: 14 }, { r: 185, count: 17 }, { r: 230, count: 19 }
  ];

  const shares = isDip ? GAME_STATE.congress.lower : GAME_STATE.congress.upper;
  const parties = PACTS.map(pact => ({ ...pact, votes: Math.round(shares[pact.id] * 100) }));
  allocateSeats(parties, total);
  const colors = parties.flatMap(pact => Array(pact.seats).fill(pact.color));
  let dotCoords = [];
  rows.forEach(row => {
    const step = Math.PI / (row.count - 1);
    for (let i = 0; i < row.count; i++) {
      const theta = Math.PI - (i * step);
      const x = cx - (row.r * Math.cos(theta));
      const y = cy - (row.r * Math.sin(theta));
      dotCoords.push({ x, y });
    }
  });

  dotCoords.sort((a,b) => a.x - b.x);

  dotCoords.forEach((c, idx) => {
    if (idx >= total) return;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', c.x);
    circle.setAttribute('cy', c.y);
    circle.setAttribute('r', isDip ? '5.5' : '8');

    circle.setAttribute('fill', colors[idx] || '#64748B');
    circle.setAttribute('stroke', '#FFFFFF');
    circle.setAttribute('stroke-width', '1');
    svg.appendChild(circle);
  });
};

window.renderLegislativeHistory = function() {
  const tbody = document.getElementById('legislative-history-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filter = element('hist-filter-area').value;
  GAME_STATE.legislativeHistory.filter(law => filter === 'all' || law.area === filter).forEach(l => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-stone-50 text-xs';
    tr.innerHTML = `
      <td class="py-2 px-3 font-bold text-blue-900">${escapeHtml(l.number)}: ${escapeHtml(l.title)}</td>
      <td class="py-2 px-2 text-center text-stone-600 font-mono">${escapeHtml(l.date)}</td>
      <td class="py-2 px-2 text-center font-mono">${escapeHtml(l.type)}</td>
      <td class="py-2 px-2 text-center font-bold text-slate-800 font-mono">${escapeHtml(l.quorum)}</td>
      <td class="py-2 px-2 text-center font-mono text-[11px]"><span class="text-emerald-700">${escapeHtml(l.yes)} Sí</span> / <span class="text-rose-700">${escapeHtml(l.no)} No</span></td>
      <td class="py-2 px-3 text-stone-700 text-[11px]">${escapeHtml(l.impact)}</td>
      <td class="py-2 px-2 text-center"><span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">${l.type === 'Simulación' ? 'VOTADO' : 'ARCHIVO'}</span></td>
    `;
    tbody.appendChild(tr);
  });
};

window.renderPoliticiansDirectory = function() {
  const tbody = document.getElementById('politicians-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const filter = element('pol-filter-bloc').value;
  for (const person of GAME_STATE.roster) {
    const party = CHILE_PARTIES.find(entry => entry.id === person.party);
    if (filter !== 'all' && party?.bloc !== filter) continue;
    const row = document.createElement('tr');
    const office = OFFICES[person.office]?.name || 'Sin contienda registrada';
    const cells = [person.name, person.party, office, GAME_STATE.year - person.born,
      party?.bloc || 'Independientes', person.victories, person.generation];
    for (const value of cells) {
      const cell = document.createElement('td');
      cell.className = 'py-2 px-2';
      cell.textContent = value;
      row.append(cell);
    }
    const action = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'px-2 py-1 border rounded';
    button.textContent = 'Ver ficha';
    button.onclick = () => window.showToast(person.name, `${party?.name || person.party} · ${office} · ${person.victories} contiendas lideradas · generación ${person.generation}.`);
    action.append(button);
    row.append(action);
    tbody.append(row);
  }
};

window.renderElectoralPactsCatalog = function() {
  const grid = document.getElementById('electoral-pacts-grid');
  if (!grid) return;
  grid.innerHTML = '';

  PACTS.forEach(pact => {
    const p = { ...pact, id: `pact-${pact.id}` };
    const isAct = (GAME_STATE.player.activePactId === p.id);
    const card = document.createElement('div');
    card.className = `p-3 border-2 rounded flex flex-col justify-between ${isAct ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-stone-300'}`;
    card.innerHTML = `
      <div>
        <div class="flex justify-between items-start mb-1">
          <strong class="text-xs" style="color: ${p.color};">${p.name}</strong>
          <span class="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${isAct ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'}">${isAct ? 'PACTO ACTIVO' : 'DISPONIBLE'}</span>
        </div>
        <div class="text-[10px] font-mono text-stone-500">Partidos: <strong>${p.parties}</strong></div>
      </div>
      <button onclick="window.togglePactMembership('${p.id}')" class="mt-3 w-full py-1 text-xs font-bold rounded border ${isAct ? 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300' : 'bg-[#0047AB] hover:bg-[#003399] text-white border-[#002266]'}">
        ${isAct ? 'Renunciar al Pacto' : 'Unirse al Pacto Electoral'}
      </button>
    `;
    grid.appendChild(card);
  });
};

window.togglePactMembership = function(pactId) {
  const { localElection, year } = GAME_STATE;
  if (localElection?.year === year && !localElection.result) {
    return warn('La lista queda fijada al inscribir la candidatura.');
  }
  if (!PACTS.some(pact => `pact-${pact.id}` === pactId)) return;
  if (GAME_STATE.player.activePactId === pactId) {
    GAME_STATE.player.activePactId = null;
    window.showToast('Pacto Disuelto', 'Ahora competirás como Independiente Fuera de Pacto.', 'info');
  } else {
    GAME_STATE.player.activePactId = pactId;
    window.showToast('¡Pacto Formalizado!', 'Has inscrito tu alianza electoral formal ante el SERVEL.', 'success');
  }
  window.renderElectoralPactsCatalog();
  window.updateDHondtSimulation();
};

window.switchMainView = function(viewId) {
  document.querySelectorAll('.folder-tab').forEach(t => t.classList.remove('active'));
  const btn = document.querySelector(`[data-view="${viewId}"]`);
  if (btn) btn.classList.add('active');

  document.querySelectorAll('.main-view').forEach(v => v.classList.add('hidden'));
  const viewEl = document.getElementById(viewId);
  if (viewEl) viewEl.classList.remove('hidden');

  document.getElementById('subtabs-campaign').classList.toggle('hidden', viewId !== 'view-campaign');
  document.getElementById('subtabs-congress').classList.toggle('hidden', viewId !== 'view-congress');
  document.getElementById('subtabs-politicians').classList.toggle('hidden', viewId !== 'view-politicians');
  document.getElementById('subtabs-office').classList.toggle('hidden', viewId !== 'view-office');

  if (viewId === 'view-profile') renderCareer();
  if (viewId === 'view-news') window.renderNewsFeed();
  if (viewId === 'view-congress') window.renderCongressHemiciclo();
  if (viewId === 'view-politicians') {
    setTimeout(() => window.renderDHondtD3Visualization(), 50);
  }
};

window.openCampaignPolls = function() {
  const tab = element('campaign-polls-tab');
  window.switchMainView('view-campaign');
  window.switchSubpanel('campaign', 'polls', tab);
  tab.focus();
};

window.switchSubpanel = function(view, key, button) {
  document.querySelectorAll(`#subtabs-${view} .subfolder-tab`).forEach(tab => {
    tab.classList.toggle('active', tab === button);
  });
  document.querySelectorAll(`[id^="${view}-panel-"]`).forEach(panel => {
    panel.classList.toggle('hidden', panel.id !== `${view}-panel-${key}`);
  });
  if (key === 'alliances') window.renderDHondtD3Visualization();
};

// Control del Menú Hamburguesa
window.toggleSessionMenu = function(e) {
  e.stopPropagation();
  document.getElementById('dropdown-session-menu').classList.toggle('hidden');
};

document.addEventListener('click', () => {
  document.getElementById('dropdown-session-menu')?.classList?.add('hidden');
});

window.openNewGameWizard = function() {
  document.getElementById('dropdown-session-menu').classList.add('hidden');
  p1AvailablePoints = 5;
  p1Attributes = { oratory: 60, charisma: 55, negotiation: 50, management: 55 };
  p1SelectedParty = 'IND';
  p1SelectedFaction = 'Ciudadano Independiente';
  p2SelectedPolicies = ['p1', 'p4', 'p9'];
  window.dismissNotice();
  element('p1-validation-alert').classList.add('hidden');
  element('p2-initial-office').value = 'none';
  element('p2-policy-topic').value = '';

  const nameInput = document.getElementById('p1-name');
  if (nameInput) nameInput.value = '';

  const ageInput = document.getElementById('p1-age');
  if (ageInput) ageInput.value = '25';

  const yearSelect = document.getElementById('p2-start-year');
  if (yearSelect) {
    yearSelect.value = '2024';
    window.p2HandleYearChange('2024');
  }

  window.p1RenderParties();
  window.p1RenderFactions(CHILE_PARTIES.find(p => p.id === 'IND'));
  window.p1HandleAgeChange(25);
  window.p2InitTerritoryCascades();

  document.getElementById('screen-page-1-identity').classList.remove('hidden');
  document.getElementById('screen-page-2-territory').classList.add('hidden');
};

const saveKey = 'tpp_chile_clean_save';
window.saveGameQuick = function() {
  try {
    localStorage.setItem(saveKey, JSON.stringify(GAME_STATE));
    window.showToast('Partida guardada', 'Progreso almacenado en este navegador.', 'success');
  } catch {
    window.showToast('Error', 'No se pudo guardar. Puedes exportar la partida.', 'error');
  }
};

function loadState(raw) {
  const value = JSON.parse(raw);
  const defaults = initialState();
  function restore(fallback, saved) {
    if (saved === undefined) return fallback;
    if (Array.isArray(fallback)) {
      if (!Array.isArray(saved)) throw new Error('Lista inválida');
      return saved;
    }
    if (fallback && typeof fallback === 'object') {
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) throw new Error('Objeto inválido');
      return Object.fromEntries(Object.entries(fallback).map(([key, field]) => [key, restore(field, saved[key])]));
    }
    if (fallback !== null && (typeof saved !== typeof fallback || (typeof saved === 'number' && !Number.isFinite(saved)))) {
      throw new Error('Valor inválido');
    }
    return saved;
  }
  if (!value?.player || typeof value.player.name !== 'string' || !Number.isInteger(value.year) || !Number.isInteger(value.week) ||
      value.week < 1 || value.week > 52) throw new Error('Partida inválida');
  const next = restore(defaults, value);
  const { player } = next;
  const bounded = (number, min, max) => Number.isFinite(number) && number >= min && number <= max;
  if (!bounded(next.year, 1900, 9999) || !bounded(player.age, 18, 110) ||
      !bounded(player.funds, 0, Number.MAX_SAFE_INTEGER) || !bounded(player.personalFunds, 0, Number.MAX_SAFE_INTEGER) ||
      !bounded(player.politicalPoints, 0, Number.MAX_SAFE_INTEGER) || !bounded(player.hours, 0, player.maxHours) ||
      !bounded(player.maxHours, 60, 120) || !bounded(player.approval, 0, 100) || !bounded(player.nameRecognition, 0, 100) ||
      !CHILE_PARTIES.some(party => party.id === player.partyId) || player.corePolicies.length !== 3 ||
      new Set(player.corePolicies).size !== 3 || !player.corePolicies.every(id => POLICIES_CATALOG.some(policy => policy.id === id)) ||
      !Object.values(player.attributes).every(score => bounded(score, 0, 100)) ||
      !player.hiredStaffIds.every(id => STAFF_CATALOG.some(staff => staff.id === id))) throw new Error('Perfil inválido');
  if (player.commune === 'Santiago Centro') player.commune = 'Santiago';
  if (!CHILE_GEO[player.region]?.districts[player.district]?.communes.includes(player.commune)) throw new Error('Domicilio inválido');
  if (!value.roster) next.roster = newRoster(next.year);
  if (next.roster.length !== 12 || !next.roster.every(person => typeof person?.name === 'string' &&
      CHILE_PARTIES.some(party => party.id === person.party) && Number.isInteger(person.born) &&
      bounded(person.generation, 1, 1000) && bounded(person.victories, 0, 10000) &&
      (person.office === '' || Object.hasOwn(OFFICES, person.office)))) throw new Error('Directorio inválido');
  if (![...next.career, ...next.newsFeed, ...next.legislativeHistory].every(entry => entry && typeof entry === 'object' && !Array.isArray(entry))) {
    throw new Error('Historial inválido');
  }
  if (next.localElection !== null) {
    next.localElection = restore({
      year: 0, office: 'concejal', pact: '', support: 0, runoffWeek: 0, runoffRival: 0, firstRound: '', messages: newMessages(), revisions: 0, lastRevision: 0, result: '',
    }, next.localElection);
    if (next.localElection.office && !Object.hasOwn(OFFICES, next.localElection.office)) throw new Error('Cargo inválido');
    const election = next.localElection;
    if (election.office && !election.result && (election.year !== next.year ||
        next.week < registrationWeek || next.week >= (election.runoffWeek || electionWeek(election.year)))) {
      throw new Error('Fecha de candidatura inválida');
    }
    if (election.runoffWeek && (!['presidente', 'gobernador'].includes(election.office) ||
      election.runoffWeek !== electionWeek(election.year) + 4 || ![0, 3, 6, 9].includes(election.runoffRival))) {
      throw new Error('Segunda vuelta inválida');
    }
    if (!Number.isInteger(election.year) || election.support < 0 ||
        !Number.isInteger(election.revisions) || election.revisions < 0 ||
        !Number.isInteger(election.lastRevision) || election.lastRevision < 0 || election.lastRevision > 52) {
      throw new Error('Elección inválida');
    }
    for (const id of Object.keys(election.messages)) election.messages[id] = Math.max(0, Math.min(4, election.messages[id]));
  }
  if (!next.player.officeId) {
    const legacyTitle = /^(Concejal|Alcalde|Diputado|Gobernador|Senador|Presidente)\b/.exec(next.player.currentOffice);
    next.player.officeId = legacyTitle?.[1].toLowerCase() || '';
  }
  if (next.player.officeId && !Object.hasOwn(OFFICES, next.player.officeId)) throw new Error('Cargo inválido');
  if (!value.campaign?.endorsements) {
    for (const contact of CONTACTS) {
      const aligned = POLICIES_CATALOG.some(policy => next.player.corePolicies.includes(policy.id) && contact.issues.includes(policy.issue));
      next.campaign.endorsements[contact.id] = next.campaign.contacts[contact.id] >= (aligned ? 1 : 2);
    }
  }
  next.volunteers = Math.max(0, Math.min(VOLUNTEER_LIMIT, next.volunteers));
  next.campaign.trained = Math.max(0, Math.min(next.volunteers, next.campaign.trained));
  if (!value.mandate && next.player.officeId) openMandate(next);
  if (next.mandate) {
    const mandate = next.mandate;
    if (!next.player.officeId || !bounded(mandate.budget, 0, 12_000_000) || !bounded(mandate.hearings, 0, 2) ||
      !bounded(mandate.completed, 0, 6) || (mandate.project &&
        (typeof mandate.project.name !== 'string' || !Number.isInteger(mandate.project.due) || mandate.project.due < 0))) throw new Error('Mandato inválido');
  }
  if (next.localManagement !== null && !['pending', 'agenda', 'audit'].includes(next.localManagement)) throw new Error('Gestión inválida');
  const previous = GAME_STATE;
  GAME_STATE = next;
  try {
    window.renderAll();
  } catch (error) {
    GAME_STATE = previous;
    window.renderAll();
    throw error;
  }
  for (const id of ['screen-page-1-identity', 'screen-page-2-territory']) {
    document.getElementById(id).classList.add('hidden');
  }
}

window.loadGameQuick = function(silent = false) {
  try {
    const raw = localStorage.getItem(saveKey);
    if (raw) {
      loadState(raw);
      if (!silent) window.showToast('Partida cargada', 'Se recuperaron tu progreso y tu historial de campaña.', 'success');
    } else if (!silent) window.showToast('Sin partida', 'No se encontró un guardado.', 'warning');
  } catch {
    window.showToast('Error', 'No se pudo recuperar la partida.', 'error');
  }
};

window.exportGameJson = function() {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(GAME_STATE, null, 2));
  const a = document.createElement('a');
  a.href = dataStr;
  a.download = `partida_${GAME_STATE.player.name.replace(/\s+/g, '_')}_${GAME_STATE.year}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.showToast('Exportado', 'Archivo JSON descargado exitosamente.', 'success');
};

window.importGameJson = function(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      loadState(event.target.result);
      window.showToast('Importado', 'Partida cargada desde archivo JSON.', 'success');
    } catch(err) {
      window.showToast('Error', 'Archivo JSON no válido.', 'error');
    }
  };
  reader.onerror = () => window.showToast('Error', 'No se pudo leer el archivo.', 'error');
  reader.readAsText(file);
  e.target.value = '';
};

window.resetGameConfirm = function() {
  if (confirm('¿Reiniciar partida a valores de fábrica?')) {
    try { localStorage.removeItem(saveKey); } catch {
      window.showToast('Error', 'No se pudo borrar el guardado.', 'error');
      return;
    }
    location.reload();
  }
};

window.dismissNotice = () => { element('game-notice').hidden = true; };

window.showToast = function(title, message, type = 'info') {
  const wizard = element('screen-page-1-identity');
  if (!wizard.classList.contains('hidden')) {
    const inline = element('p1-validation-alert');
    inline.textContent = `${title}. ${message}`;
    inline.classList.remove('hidden');
    return;
  }
  const notice = element('game-notice');
  notice.dataset.type = type;
  element('notice-title').textContent = title;
  element('notice-message').textContent = message;
  notice.hidden = false;
};

// Inicialización general
window.addEventListener('DOMContentLoaded', () => {
  initPrograms();
  initDomicile();
  window.p1RenderParties();
  window.p1RenderFactions(CHILE_PARTIES.find(p => p.id === 'IND'));
  window.p1UpdateProfessions(25);

  window.loadGameQuick(true);
  window.renderAll();
});
