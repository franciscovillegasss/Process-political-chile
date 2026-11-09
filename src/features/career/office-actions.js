const ACTIONS = {
  concejal: [
    ['Fiscalizar una obra', 8, 0, 2, 0.8, 'Revisaste el avance y dejaste observaciones para Alcaldía.'],
    ['Presidir audiencia vecinal', 10, 0, 1, 1.2, 'Recogiste observaciones de vecinos para el concejo.', 'vecinos'],
    ['Negociar una indicación', 8, 1, 0, 1.6, 'Conseguiste atención para una modificación en el concejo.'],
  ],
  alcalde: [
    ['Coordinar servicios municipales', 10, 1, 0, 1.6, 'Reordenaste prioridades de atención municipal.'],
    ['Abrir presupuesto participativo', 12, 0, 2, 1, 'La comunidad priorizó necesidades para la próxima cartera.', 'vecinos'],
    ['Revisar ejecución de obras', 8, 1, 0, 0.8, 'Aceleraste una obra municipal en ejecución.', '', true],
  ],
  core: [
    ['Fiscalizar la cartera regional', 8, 0, 2, 0.8, 'Solicitaste antecedentes para el Consejo Regional.'],
    ['Presentar observaciones a inversión', 10, 1, 0, 1.4, 'Tus observaciones quedaron en la agenda del Consejo.'],
    ['Convocar audiencia intercomunal', 12, 0, 1, 1, 'Incorporaste prioridades de organizaciones territoriales.', 'civico'],
  ],
  gobernador: [
    ['Coordinar una mesa intercomunal', 12, 0, 2, 1.2, 'Alineaste prioridades entre municipios y el gobierno regional.', 'vecinos'],
    ['Presentar cartera de inversión', 14, 2, 0, 2, 'La propuesta regional queda registrada para evaluación del Consejo.'],
    ['Pactar coordinación productiva', 10, 1, 1, 0.8, 'Convocaste a organizaciones productivas a la agenda regional.', 'productivo'],
  ],
  diputado: [
    ['Solicitar antecedentes de fiscalización', 8, 0, 2, 0.6, 'Presentaste una solicitud de información desde la Cámara.'],
    ['Preparar una indicación de comisión', 12, 1, 0, 1.4, 'Registraste una propuesta para negociar su patrocinio.'],
    ['Abrir oficina distrital', 10, 0, 1, 1.2, 'Recogiste demandas de organizaciones del distrito.', 'vecinos'],
  ],
  senador: [
    ['Revisar un proyecto en comisión', 12, 1, 0, 1.5, 'Preparaste una revisión del proyecto para la discusión en sala.'],
    ['Negociar acuerdo entre bancadas', 12, 0, 2, 0.8, 'Construiste respaldo para la agenda legislativa.'],
    ['Convocar audiencia regional', 10, 0, 1, 1, 'Recogiste prioridades de organizaciones de la región.', 'civico'],
  ],
  presidente: [
    ['Convocar al comité político', 10, 0, 2, 0.8, 'Ordenaste las prioridades del gabinete.'],
    ['Anunciar agenda del Ejecutivo', 14, 2, 0, 2, 'Presentaste prioridades públicas para el Gobierno.'],
    ['Coordinar una mesa de empleo', 12, 1, 1, 1.2, 'Convocaste a actores productivos para revisar medidas de empleo.', 'productivo'],
  ],
};

export function officeActions(office) {
  return (ACTIONS[office] ?? []).map(([name, hours, points, gain, approval, detail, contact, expedites], id) =>
    ({ id, name, hours, points, gain, approval, detail, contact, expedites }));
}
