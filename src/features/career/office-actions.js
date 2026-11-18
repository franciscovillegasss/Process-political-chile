const ACTIONS = {
  concejal: ['Fiscalizar presupuesto municipal', 'Audiencia vecinal', 'Preparar una indicación'],
  alcalde: ['Revisar cuentas municipales', 'Presupuesto participativo', 'Supervisar una obra'],
  core: ['Fiscalizar inversión regional', 'Audiencia intercomunal', 'Preparar acuerdo regional'],
  gobernador: ['Revisar cartera regional', 'Mesa intercomunal', 'Supervisar un programa'],
  diputado: ['Solicitar antecedentes de fiscalización', 'Oficina distrital', 'Preparar indicación de comisión'],
  senador: ['Revisar cuentas del Ejecutivo', 'Audiencia regional', 'Preparar revisión legislativa'],
  presidente: ['Revisar ejecución presupuestaria', 'Mesa de empleo', 'Supervisar implementación'],
};

export function officeActions(office) {
  const executive = ['alcalde', 'gobernador', 'presidente'].includes(office);
  return (ACTIONS[office] ?? []).map((name, id) => ({ id, name, hours: id === 1 ? 10 : 8, points: 0,
    effect: id === 0 ? 'audit' : id === 1 ? 'contact' : executive ? 'expedite' : 'prepare',
    detail: id === 0 ? 'Informe del saldo y compromisos públicos. +1 PP, disponible cada cuatro semanas.'
      : id === 1 ? 'Renueva el vínculo territorial, disponible cada cuatro semanas.'
        : executive ? 'Adelanta una semana la entrega. Una supervisión por proyecto.'
          : 'Prepara el siguiente expediente para presentarlo por 6 horas en lugar de 10.',
  }));
}
