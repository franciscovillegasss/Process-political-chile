import { localContactDiscount, recordLocalContact, recordMobilization } from '../territory/rules.js';
import { refreshCampaign } from '../../app/render.js';
import { GAME_STATE, pay } from '../../app/state.js';
import { ADS, CONTACTS, VOLUNTEER_LIMIT, focusBonus } from './rules.js';
import { staffTotals } from './staff.js';
import { calendarWeek, fundraisingYield } from '../career/rules.js';
import { POLICIES_CATALOG } from '../character/programs.js';
import { updateCompass } from '../character/compass.js';
import { requireElection } from '../elections/actions.js';
import { LOCAL_ACTIONS, electionField } from '../elections/rules.js';
import { campaignClimate, messageImpact } from '../electorate/rules.js';
import { clp, element, showToast, warn } from '../../shared/dom.js';

function reportCampaign(title, detail) {
  const { campaign, week } = GAME_STATE;
  campaign.activity.unshift({ week, title, detail });
  campaign.activity.length = Math.min(campaign.activity.length, 20);
  showToast(title, detail, 'success');
  refreshCampaign();
}

const executeCampaignAction = function(key) {
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

const fundraiseAction = function() {
  const { campaign, player } = GAME_STATE;
  if (campaign.fundraising >= 2) return warn('Puedes organizar hasta dos cenas por semana.');
  if (!pay({ hours: 12 })) return;
  const raised = fundraisingYield(GAME_STATE, staffTotals().fundraisingBonus);
  campaign.fundraising++;
  campaign.donorFatigue = Math.min(8, campaign.donorFatigue + 1);
  player.funds += raised;
  reportCampaign('Recaudación', `+${clp(raised)} en fondos de campaña.`);
};

const launchAdCampaign = function(key) {
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

const meetContact = function(id) {
  const election = requireElection();
  const contact = CONTACTS.find(item => item.id === id);
  if (!election || !contact) return;
  const { campaign, player } = GAME_STATE;
  const aligned = POLICIES_CATALOG.some(policy => player.corePolicies.includes(policy.id) && contact.issues.includes(policy.issue));
  const needed = Math.max(1, (aligned ? 1 : 2) - localContactDiscount(GAME_STATE, id));
  if (campaign.endorsements[id] || !pay({ hours: 8 })) return;
  campaign.contacts[id]++;
  if (campaign.contacts[id] >= needed) {
    campaign.endorsements[id] = true;
    recordLocalContact(GAME_STATE, id);
    election.support += contact.support;
    reportCampaign('Respaldo confirmado', `${contact.name} · +${contact.support} puntos de campaña.`);
  } else reportCampaign('Contacto realizado', `${contact.name} · falta una reunión para conseguir su respaldo.`);
};

const commissionPoll = function() {
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

const promotePolicy = function(id) {
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

const revisePolicy = function() {
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

const manageVolunteers = function(action) {
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
    recordMobilization(GAME_STATE, campaign.mobilized);
    const support = campaign.mobilized + Math.min(campaign.mobilized, campaign.trained);
    election.support += support;
    reportCampaign('Brigada movilizada', `${campaign.mobilized} voluntarios · +${support} puntos de campaña. Disponibles nuevamente la próxima semana.`);
  }
};

const buildPoliticalCapital = function() {
  const { campaign, player } = GAME_STATE;
  if (calendarWeek(GAME_STATE) - campaign.lastCommunity < 4) return warn('El trabajo territorial da PP una vez cada cuatro semanas.');
  if (!pay({ hours: 12 })) return;
  campaign.lastCommunity = calendarWeek(GAME_STATE);
  const points = player.politicalPoints < 10 ? 5 : 3;
  player.politicalPoints += points;
  reportCampaign('Trabajo territorial', `+${points} PP al organizar una actividad comunitaria.`);
};

const restPolitician = function() {
  const { campaign, player } = GAME_STATE;
  if (campaign.rested || player.hours >= player.maxHours) return warn('Puedes recuperar horas una vez por semana, después de una actividad.');
  campaign.rested = true;
  const recovered = Math.min(6, player.maxHours - player.hours);
  player.hours += recovered;
  reportCampaign('Descanso', `+${recovered} horas recuperadas esta semana.`);
};

const personalContribution = function() {
  const { player } = GAME_STATE;
  const amount = Math.min(500_000, player.personalFunds);
  if (!amount) return warn('Agotaste tus ahorros personales.');
  player.personalFunds -= amount;
  player.funds += amount;
  reportCampaign('Aporte propio', `${clp(amount)} transferidos desde tus ahorros personales.`);
};

export { reportCampaign, executeCampaignAction, fundraiseAction, launchAdCampaign, meetContact, commissionPoll, promotePolicy, revisePolicy, manageVolunteers, buildPoliticalCapital, restPolitician, personalContribution };
