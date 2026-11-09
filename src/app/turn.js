import { refreshCampaign } from './render.js';
import { GAME_STATE } from './state.js';
import { VOLUNTEER_LIMIT, weeklyCampaign } from '../features/campaign/rules.js';
import { renderStaffPanel, staffTotals } from '../features/campaign/staff.js';
import { renderCountry } from '../features/campaign/view.js';
import { retire } from '../features/career/profile.js';
import { renderPoliticiansDirectory } from '../features/career/roster.js';
import { RETIREMENT_AGE, completeProject, renewRoster } from '../features/career/rules.js';
import { resolveElection } from '../features/elections/actions.js';
import { electionWeek, registrationWeek } from '../features/elections/rules.js';
import { renderPublicOpinionTable } from '../features/electorate/opinion.js';
import { decayMessages, publicAgenda } from '../features/electorate/rules.js';
import { showToast } from '../shared/dom.js';
import { switchMainView } from '../ui/navigation.js';

const advanceTurn = function(weeksToAdvance = 1) {
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
      renderPoliticiansDirectory();
      showToast('¡Año Nuevo Constitucional!', `Comienza el año ${GAME_STATE.year}. Tienes ${GAME_STATE.player.age} años cumplidos.`, 'success');
    }

    const player = GAME_STATE.player;
    const payroll = staffTotals().salaryWeekly;
    if (payroll > player.funds) {
      player.hiredStaffIds = [];
      payrollWarning = true;
      showToast('Equipo desvinculado', 'El presupuesto no alcanza para pagar la planilla.', 'warning');
    } else {
      player.funds -= payroll;
    }
    const bonuses = staffTotals();
    player.hours = player.maxHours = 60 + bonuses.bonusHours;
    player.nameRecognition = Math.max(8, Math.min(100, player.nameRecognition + bonuses.bonusRecogWeekly - 0.15));
    GAME_STATE.volunteers = Math.min(VOLUNTEER_LIMIT, GAME_STATE.volunteers + bonuses.bonusVolunteersWeekly);
    weeklyCampaign(GAME_STATE);
    if (completeProject(GAME_STATE)) showToast('Proyecto ejecutado', 'Consulta el efecto en Cargo e Historial.', 'success');
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
        if (GAME_STATE.localElection.result) showToast('Escrutinio electoral', 'El resultado está disponible en Elecciones.', 'info');
        else showToast('Segunda vuelta', GAME_STATE.localElection.firstRound, 'info');
        renderPoliticiansDirectory();
      } else showToast('Inscripciones abiertas', 'Elige un cargo en Elecciones para iniciar tu campaña.', 'info');
      switchMainView('view-elections');
      announced = true;
      break;
    }
    if (payrollWarning) break;
  }

  const agenda = publicAgenda(GAME_STATE);
  if (!announced && !payrollWarning && agenda !== previousAgenda) showToast('Cambió la agenda pública', `${agenda.title}. Revisa el efecto en tus tres ejes.`);
  refreshCampaign();
  renderCountry(GAME_STATE);
  renderPublicOpinionTable();
  renderStaffPanel();
};

export { advanceTurn };
