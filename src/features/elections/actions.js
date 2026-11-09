import { campaignAllowance, grantCampaignWeek } from '../campaign/funding.js';
import { profileAllows, profileSeats, RM_COMMUNES, RM_PROFILE } from './rm-profile.js';
import { canEndorse } from './runoff.js';
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
    profileAllows(GAME_STATE.profile, player.region, id) && player.age >= office.age && officeTerritory(office, player, CHILE_GEO) &&
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
  grantCampaignWeek(GAME_STATE.localElection, GAME_STATE.week);
  recordCareer(GAME_STATE, 'Candidatura', `Inscripción para ${OFFICES[id].name}.`);
  reportCampaign('Candidatura inscrita', `Ya puedes hacer campaña para ${OFFICES[id].name}. Aporte semanal: $${campaignAllowance(id).toLocaleString('es-CL')}.`);
};

function resolveElection() {
  const { localElection, year, player } = GAME_STATE;
  if (localElection?.year === year && localElection.result) return;
  const candidate = localElection?.year === year && localElection.office ? localElection : null;
  const id = candidate?.office || 'concejal';
  const districtSeats = profileSeats(GAME_STATE.profile, player, id) ?? (id === 'diputado' ? CHILE_GEO[player.region]?.districts[player.district]?.seats : undefined);
  const climate = campaignClimate(GAME_STATE);
  const result = candidate ? countElection({ ...candidate, profile: GAME_STATE.profile }, player, districtSeats, GAME_STATE.week, climate, GAME_STATE.roster, true)
    : { won: false, summary: 'Sin candidatura inscrita en este ciclo electoral.' };
  const broadcast = candidate ? (() => {
    const field = electionField(candidate, player, GAME_STATE.week, climate, GAME_STATE.roster);
    return {
      title: `${candidate.runoffWeek ? 'Segunda vuelta' : 'Noche electoral'} · ${OFFICES[id].name} · ${year}`,
      summary: result.summary,
      won: result.won,
      candidates: [{ name: player.name, votes: field.votes, player: true },
        ...field.rivals.map(rival => ({ name: rival.name, votes: rival.votes }))],
    };
  })() : null;
  if (year % 4 === 1 && GAME_STATE.week === electionWeek(year)) updateCongress(climate);
  if (result.runoff !== undefined) {
    Object.assign(candidate, { runoffWeek: GAME_STATE.week + 4, runoffRival: result.runoff, runoffSnapshot: result.snapshot, runoffEndorsements: [], firstRound: result.summary });
    recordCareer(GAME_STATE, 'Primera vuelta', result.summary);
    return broadcast;
  }
  const { won, summary } = result;
  GAME_STATE.localElection = { ...(candidate || { year, office: '', pact: 'ind', support: 0 }), campaignFunds: 0, result: summary };
  if (result.pending) {
    recordCareer(GAME_STATE, 'Elección pendiente', summary);
    return broadcast;
  }
  if (candidate) {
    recordCareer(GAME_STATE, 'Elección', summary);
    if (!won) {
      const rival = electionField(candidate, player, GAME_STATE.week, climate, GAME_STATE.roster).rivals[0];
      const person = GAME_STATE.roster[rival.slot];
      person.victories++;
      person.office = id;
      if (id === 'alcalde' || id === 'presidente') {
        const territory = id === 'presidente' ? 'Chile' : player.commune;
        const previous = GAME_STATE.governmentResults.findIndex(entry => entry.office === id && entry.territory === territory);
        if (previous >= 0) GAME_STATE.governmentResults.splice(previous, 1);
        GAME_STATE.governmentResults.unshift({ office: id, territory, year, name: person.name, party: person.party });
      }
      recordCareer(GAME_STATE, 'Contienda', `${person.name} encabezó el voto rival en ${OFFICES[id].name}.`);
    }
  }
  const outgoing = player.officeEndYear > 0 ? player.officeEndYear === year
    : player.officeId && cycleOffices(year, player.region).some(([officeId]) => officeId === player.officeId);
  if (won) {
    const territory = id === 'presidente' ? 'Chile' : player.commune;
    GAME_STATE.governmentResults = GAME_STATE.governmentResults.filter(entry => entry.office !== id || entry.territory !== territory);
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
  return broadcast;
}

function seekRunoffEndorsement(slot) {
  const election = activeElection();
  if (!election?.runoffWeek) return warn('Los respaldos se negocian entre ambas vueltas.');
  const climate = campaignClimate(GAME_STATE);
  const field = electionField(election, GAME_STATE.player, GAME_STATE.week, climate, GAME_STATE.roster);
  const candidate = field.eliminated.find(entry => entry.slot === slot);
  const endorsements = election.runoffEndorsements ?? [];
  if (!candidate || endorsements.includes(slot) || !canEndorse(slot, election.runoffRival, climate.position)) {
    return warn('Esta candidatura no está disponible para un acuerdo.');
  }
  if (!pay({ hours: 8 })) return;
  election.runoffSnapshot ??= field.snapshot;
  election.runoffEndorsements = [...endorsements, slot];
  recordCareer(GAME_STATE, 'Segunda vuelta', `${candidate.name} anunció su respaldo.`);
  reportCampaign('Respaldo de segunda vuelta', `${candidate.name} pidió a sus votantes apoyar tu candidatura. Parte de ese electorado aún puede abstenerse o votar por tu rival.`);
}

function officeTitle(id, player) {
  const office = OFFICES[id];
  if (!office) return 'Ciudadano sin Cargo';
  if (id === 'core' && GAME_STATE.profile === RM_PROFILE) return `Consejería regional · ${RM_COMMUNES[player.commune]?.constituency}`;
  const territory = officeTerritory(office, player, CHILE_GEO);
  return office.scope === 'country' ? office.name : `${office.name} de ${territory}`;
}

export { activeElection, requireElection, canRegister, eligibleOffices, registerCandidate, resolveElection, officeTitle, seekRunoffEndorsement };
