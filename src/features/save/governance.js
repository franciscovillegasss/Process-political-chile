import { INSTITUTIONS, GOVERNMENT_BLOCS, projectTerms, isBicameral } from '../career/governance-rules.js';
import { POLICIES_CATALOG } from '../character/programs.js';
import { SERVICE_ISSUES, knownServiceTerritories } from '../career/public-services.js';

export function validateGovernance(state) {
  const now = state.year * 52 + state.week;
  const integer = (value, min, max) => Number.isSafeInteger(value) && value >= min && value <= max;
  const services = knownServiceTerritories();
  if (new Set(state.publicServices.map(record => `${record?.territory}/${record?.issue}`)).size !== state.publicServices.length ||
      !state.publicServices.every(record => services.has(record?.territory) && SERVICE_ISSUES.includes(record.issue) &&
        Number.isFinite(record.improvement) && record.improvement >= 0 && record.improvement <= 30)) throw new Error('Servicios públicos inválidos');
  const statuses = ['pending', 'progress', 'blocked', 'fulfilled', 'unfulfilled', 'blocked-final'];
  if (new Set(state.promises.map(promise => `${promise?.term}/${promise?.name}/${promise?.policyId}`)).size !== state.promises.length ||
      !state.promises.every(promise => integer(promise?.term, 0, now) && integer(promise.year, 1900, state.year) &&
        typeof promise.name === 'string' && (promise.objective === undefined || typeof promise.objective === 'string') && Object.hasOwn(INSTITUTIONS, promise.office) &&
        POLICIES_CATALOG.some(policy => policy.id === promise.policyId) && statuses.includes(promise.status))) throw new Error('Compromisos inválidos');
  const mandate = state.mandate;
  if (!mandate) return;
  if ((mandate.budgetYear !== undefined && !integer(mandate.budgetYear, 1900, state.year)) ||
      (mandate.maintenance !== undefined && !integer(mandate.maintenance, 0, 12_000_000)) ||
      (mandate.lastBudgetTick !== undefined && !integer(mandate.lastBudgetTick, 0, now)) ||
      (mandate.term !== undefined && !integer(mandate.term, 0, now)) ||
      (mandate.prepared !== undefined && typeof mandate.prepared !== 'boolean')) throw new Error('Presupuesto público inválido');
  if (mandate.deskUses !== undefined && (!mandate.deskUses || typeof mandate.deskUses !== 'object' || Array.isArray(mandate.deskUses) ||
      !Object.entries(mandate.deskUses).every(([id, week]) => ['0', '1', '2'].includes(id) && integer(week, 0, now)))) throw new Error('Despacho inválido');
  if (mandate.programs !== undefined && (!Array.isArray(mandate.programs) || mandate.programs.length > SERVICE_ISSUES.length ||
      new Set(mandate.programs.map(program => program?.issue)).size !== mandate.programs.length ||
      !mandate.programs.every(program => SERVICE_ISSUES.includes(program?.issue) && integer(program.started, 0, now) &&
        program.until === program.started + 12 && integer(program.lastPayment, program.started, Math.min(now, program.until))))) throw new Error('Programas públicos inválidos');
  const project = mandate.project;
  if (!project?.government) return;
  const policy = POLICIES_CATALOG.find(item => item.id === project.policyId);
  const config = INSTITUTIONS[project.office];
  const bodies = isBicameral(project.office)
    ? project.office === 'senador' ? ['Senado', 'Cámara de Diputados'] : ['Cámara de Diputados', 'Senado']
    : [config?.body];
  if (project.government !== true || !config || project.office !== state.player.officeId || project.municipalId || !policy ||
      project.issue !== policy.issue || project.name !== `${config.instrument} de ${policy.issue.toLowerCase()}` ||
      !['proposal', 'review', 'authorized', 'executing'].includes(project.status) ||
      (project.status === 'review' && !isBicameral(project.office)) ||
      (project.status === 'executing') !== Boolean(project.due) ||
      typeof project.lastVote !== 'string' || !Array.isArray(project.agreements) ||
      new Set(project.agreements).size !== project.agreements.length ||
      !project.agreements.every(id => GOVERNMENT_BLOCS.some(bloc => bloc.id === id)) ||
      !Array.isArray(project.approvals) || project.approvals.length !==
        (project.status === 'proposal' ? 0 : project.status === 'review' ? 1 : isBicameral(project.office) ? 2 : 1) ||
      !project.approvals.every((body, index) => body === bodies[index]) || projectTerms(project).cost > 12_000_000) {
    throw new Error('Tramitación pública inválida');
  }
}
