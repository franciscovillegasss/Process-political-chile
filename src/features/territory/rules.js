const PRIORITIES = ['Seguridad', 'Salud', 'Educación', 'Vivienda y ciudad', 'Medioambiente', 'Trabajo y transporte',
  'Economía', 'Instituciones y derechos', 'Pensiones'];

function seed(commune) {
  return [...commune].reduce((value, char) => (value * 31 + char.codePointAt(0)) % 997, 0);
}

function recordFor(state) {
  const commune = state.player.commune;
  let record = state.territories?.find(entry => entry.commune === commune);
  if (!record) {
    record = { commune, projects: [], contacts: [], participation: 0, participationYear: state.year };
    (state.territories ??= []).push(record);
  }
  return record;
}

export function localProfile(state) {
  const commune = state.player.commune || '';
  const value = seed(commune);
  const record = state.territories?.find(entry => entry.commune === commune);
  const base = PRIORITIES.map((issue, index) => ({
    issue, need: 0.44 + ((value * (index + 3) + index * 17) % 43) / 100,
  }));
  const recent = record?.projects.map(project => ({
    ...project, weight: Math.max(0, 1 - ((state.year - project.year) * 52 + state.week - project.week) / 312),
  })).filter(project => project.weight > 0) ?? [];
  const needs = base.map(item => ({
    ...item,
    need: Math.max(0.18, item.need - recent.filter(project => project.issue === item.issue)
      .reduce((sum, project) => sum + 0.18 * project.weight, 0)),
  })).sort((a, b) => b.need - a.need);
  const participation = record ? Math.max(0, record.participation - Math.max(0, state.year - record.participationYear) * 4) : 0;
  return {
    needs, projects: record?.projects ?? [], recent, participation,
    contacts: record?.contacts.filter(contact => state.year - contact.year <= 8) ?? [],
  };
}

export function recordLocalProject(state, project) {
  if (['concejal', 'alcalde'].includes(state.player.officeId)) {
    recordFor(state).projects.unshift({ issue: project.issue, name: project.name, year: state.year, week: state.week });
  }
}

export function recordLocalContact(state, id) {
  const record = recordFor(state);
  record.contacts = record.contacts.filter(contact => contact.id !== id);
  record.contacts.push({ id, year: state.year });
}

export function recordMobilization(state, volunteers) {
  const participation = localProfile(state).participation;
  const record = recordFor(state);
  record.participation = Math.min(30, participation + Math.ceil(volunteers / 20));
  record.participationYear = state.year;
}

export function localContactDiscount(state, id) {
  return Number(localProfile(state).contacts.some(contact => contact.id === id));
}

export function territoryWeight(office) {
  if (office === 'presidente') return 0;
  if (['gobernador', 'senador'].includes(office)) return 0.2;
  if (['diputado', 'core'].includes(office)) return 0.45;
  return 1;
}
