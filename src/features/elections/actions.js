import { GAME_STATE, pay } from '../../app/state.js';
import { reportCampaign } from '../campaign/actions.js';
import { initialCampaign } from '../campaign/rules.js';
import { registrationCost } from '../campaign/staff.js';
import { giveUpOffice, openMandate, recordCareer } from '../career/rules.js';
import { updateCongress } from '../congress/chambers.js';
import { LOCAL_REGISTRATION, OFFICES, PACTS, countElection, cycleOffices, electionField, electionWeek, officeTerritory, registrationWeek } from './rules.js';
import { campaignClimate, newMessages } from '../electorate/rules.js';
import { CHILE_GEO } from '../../shared/geography.js';
import { element, warn } from '../../shared/dom.js';

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

const canRegister = ({ year, week, localElection }) =>
  electionWeek(year) !== null && week >= registrationWeek && week < electionWeek(year) && localElection?.year !== year;

function eligibleOffices(player, year) {
  return cycleOffices(year, player.region).filter(([id, office]) =>
    player.age >= office.age && officeTerritory(office, player, CHILE_GEO) &&
    (id !== 'presidente' || player.officeId !== 'presidente'));
}

const registerCandidate = function() {
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

export { activeElection, requireElection, canRegister, eligibleOffices, registerCandidate, resolveElection, officeTitle };
