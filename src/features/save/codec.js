import { firstRoundSnapshot } from '../elections/runoff.js';
import { campaignClimate } from '../electorate/rules.js';
import { initialState } from '../../app/state.js';
import { CONTACTS, VOLUNTEER_LIMIT } from '../campaign/rules.js';
import { newRoster, openMandate } from '../career/rules.js';
import { POLICIES_CATALOG } from '../character/programs.js';
import { OFFICES, electionField, electionWeek, registrationWeek } from '../elections/rules.js';
import { newMessages } from '../electorate/rules.js';
import { CHILE_GEO } from '../../shared/geography.js';
import { CHILE_PARTIES } from '../../shared/parties.js';
import { STAFF_CATALOG } from '../campaign/staff-catalog.js';

export function decodeSave(raw) {
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
      year: 0, office: 'concejal', pact: '', support: 0, runoffWeek: 0, runoffRival: 0, runoffSnapshot: null, runoffEndorsements: [], firstRound: '', messages: newMessages(), revisions: 0, lastRevision: 0, result: '',
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
    const slots = [0, 3, 6, 9];
    const ballots = count => Number.isSafeInteger(count) && count >= 0;
    const snapshot = election.runoffSnapshot;
    if (snapshot !== null && (!election.runoffWeek || !ballots(snapshot?.votes) ||
        !Array.isArray(snapshot.rivals) || snapshot.rivals.length !== slots.length ||
        !slots.every(slot => snapshot.rivals.some(rival => rival?.slot === slot && ballots(rival.votes))))) {
      throw new Error('Escrutinio previo inválido');
    }
    if (new Set(election.runoffEndorsements).size !== election.runoffEndorsements.length ||
        !election.runoffEndorsements.every(slot => election.runoffWeek && slots.includes(slot) && slot !== election.runoffRival)) {
      throw new Error('Respaldos inválidos');
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
  const knownIssue = issue => POLICIES_CATALOG.some(policy => policy.issue === issue);
  if (next.mandate) {
    const mandate = next.mandate;
    if (!next.player.officeId || !bounded(mandate.budget, 0, 12_000_000) || !bounded(mandate.hearings, 0, 2) ||
      !bounded(mandate.completed, 0, 6) || (mandate.project &&
        (typeof mandate.project.name !== 'string' || !knownIssue(mandate.project.issue) ||
          typeof mandate.project.relevant !== 'boolean' || !Number.isInteger(mandate.project.due) || mandate.project.due < 0))) throw new Error('Mandato inválido');
  }
  if (next.localManagement !== null && !['pending', 'agenda', 'audit'].includes(next.localManagement)) throw new Error('Gestión inválida');
  const communes = new Set(Object.values(CHILE_GEO).flatMap(region =>
    Object.values(region.districts).flatMap(district => district.communes)));
  if (new Set(next.territories.map(record => record?.commune)).size !== next.territories.length ||
      !next.territories.every(record => communes.has(record?.commune) && bounded(record.participation, 0, 30) &&
        Number.isInteger(record.participationYear) && bounded(record.participationYear, 1900, next.year) &&
        Array.isArray(record.projects) && record.projects.every(project => knownIssue(project?.issue) &&
          typeof project.name === 'string' && Number.isInteger(project.year) && bounded(project.year, 1900, next.year) &&
          Number.isInteger(project.week) && bounded(project.week, 1, 52) &&
          (project.year !== next.year || project.week <= next.week)) &&
        Array.isArray(record.contacts) && record.contacts.every(contact => CONTACTS.some(item => item.id === contact?.id) &&
          Number.isInteger(contact.year) && bounded(contact.year, 1900, next.year)))) {
    throw new Error('Memoria territorial inválida');
  }
  const election = next.localElection;
  if (election?.runoffWeek && !election.runoffSnapshot && !election.result) {
    const first = electionField({ ...election, runoffWeek: 0 }, player, electionWeek(election.year), campaignClimate(next), next.roster);
    election.runoffSnapshot = firstRoundSnapshot(first.votes, first.rivals);
    election.firstRound += ' La base de votos se estimó a partir de este guardado anterior.';
  }
  return next;
}
