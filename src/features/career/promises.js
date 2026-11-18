import { POLICIES_CATALOG } from '../character/programs.js';

export function beginPromises(state) {
  const term = state.year * 52 + state.week;
  state.mandate.term = term;
  state.promises ??= [];
  for (const policyId of state.player.corePolicies ?? []) {
    const policy = POLICIES_CATALOG.find(item => item.id === policyId);
    const scope = ['concejal', 'alcalde'].includes(state.player.officeId) ? `en ${state.player.commune}`
      : ['core', 'gobernador'].includes(state.player.officeId) ? 'en la región' : '';
    const objective = scope ? `Mejorar ${policy.issue.toLowerCase()} ${scope}` : policy.name;
    state.promises.push({ term, year: state.year, name: state.player.name,
      office: state.player.officeId, policyId, objective, status: 'pending' });
  }
}

export function updatePromises(state, project, status) {
  for (const promise of state.promises ?? []) {
    if (promise.term !== state.mandate?.term || promise.name !== state.player.name || promise.status === 'fulfilled') continue;
    const policy = POLICIES_CATALOG.find(item => item.id === promise.policyId);
    if (project.policyId ? promise.policyId === project.policyId : policy?.issue === project.issue) promise.status = status;
  }
}

export function closePromises(state) {
  for (const promise of state.promises ?? []) {
    if (promise.term === state.mandate?.term && promise.name === state.player.name && promise.status !== 'fulfilled') {
      promise.status = promise.status === 'blocked' ? 'blocked-final' : 'unfulfilled';
    }
  }
}

export function promiseReputation(state) {
  const recent = (state.promises ?? []).filter(promise => promise.name === state.player.name &&
    state.year - promise.year <= 8);
  const fulfilled = recent.filter(promise => promise.status === 'fulfilled').length;
  const broken = recent.filter(promise => promise.status === 'unfulfilled').length;
  return Math.max(0.92, Math.min(1.12, 1 + fulfilled * 0.03 - broken * 0.02));
}
