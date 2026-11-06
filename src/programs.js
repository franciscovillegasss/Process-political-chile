const programs = [
  ['Seguridad', [
    ['p1', 'Militarización de infraestructura crítica y fronteras', 0, 2],
    ['p2', 'Cárceles de alta seguridad y aislamiento de bandas', 0, 2],
    ['p3', 'Expulsión administrativa rápida con control judicial', 0, 2],
    ['p13', 'Policía de proximidad y prevención barrial', -1, 0],
    ['p14', 'Reinserción y sanciones alternativas supervisadas', -1, -2],
    ['p15', 'Investigación patrimonial del crimen organizado', 0, 1],
  ]],
  ['Economía', [
    ['p4', 'Rebaja del impuesto corporativo al 23%', 2, 0],
    ['p5', 'Ventanilla rápida de permisos para inversión', 2, 0],
    ['p6', 'Salario mínimo de $650.000 con apoyo a pymes', -1, 0],
    ['p19', 'Impuesto progresivo al patrimonio', -2, 0],
    ['p20', 'Crédito y compras públicas para cooperativas y pymes', -1, 0],
    ['p21', 'Regla fiscal y evaluación de programas públicos', 1, 0],
  ]],
  ['Pensiones', [
    ['p7', 'Cotización adicional en cuentas individuales heredables', 2, 0],
    ['p8', 'Fondo solidario mixto para pensiones', -2, 0],
    ['p24', 'Aumento focalizado de la PGU', -1, 0],
  ]],
  ['Salud', [
    ['p9', 'Reducir listas de espera con derivación a prestadores', 1, 0],
    ['p26', 'Fortalecer la atención primaria y la salud mental', -2, 0],
    ['p27', 'Seguro nacional universal de salud', -2, 0],
    ['p28', 'Libre elección de prestadores con subsidio focalizado', 2, 0],
  ]],
  ['Educación', [
    ['p29', 'Educación técnico-profesional y formación dual', 1, 0],
    ['p30', 'Financiamiento basal para educación pública', -2, 0],
    ['p31', 'Autonomía escolar con evaluación de resultados', 1, 0],
    ['p32', 'Fin del CAE y financiamiento solidario', -2, 0],
  ]],
  ['Vivienda y ciudad', [
    ['p33', 'Arriendo protegido y parque público de viviendas', -2, 0],
    ['p34', 'Densificación cerca del transporte público', 0, -1],
    ['p35', 'Subsidios de vivienda con oferta privada', 2, 0],
    ['p36', 'Veredas accesibles, iluminación y plazas barriales', -1, 0],
  ]],
  ['Medioambiente', [
    ['p37', 'Transición energética con empleos para zonas de sacrificio', -1, -1],
    ['p38', 'Mercado de emisiones para la industria', 1, -1],
    ['p39', 'Protección de cuencas y humedales urbanos', -1, -1],
    ['p40', 'Agua rural e infraestructura de adaptación a sequías', -1, 0],
  ]],
  ['Instituciones y derechos', [
    ['p41', 'Presupuestos participativos y datos abiertos', -1, -2],
    ['p42', 'Transferencia de competencias y recursos a regiones', 0, -1],
    ['p43', 'Simplificación de trámites y protección de datos', 1, -1],
    ['p44', 'Política nacional de cuidados', -2, -1],
    ['p45', 'Ampliar garantías de libertad de conciencia y asociación', 0, -2],
    ['p46', 'Control fronterizo y registro de ingreso', 0, 2],
  ]],
  ['Trabajo y transporte', [
    ['p47', 'Negociación colectiva sectorial', -2, 0],
    ['p48', 'Flexibilidad horaria pactada y capacitación laboral', 2, 0],
    ['p49', 'Transporte público rural y buses eléctricos', -1, 0],
    ['p50', 'Concesiones para mejorar la conectividad regional', 2, 0],
  ]],
];

export const POLICIES_CATALOG = programs.flatMap(([issue, options]) =>
  options.map(([id, name, economy, authority]) => ({ id, issue, name, economy, authority })));

export const PROGRAM_PRESETS = [
  ['Municipalismo vecinal', ['Policía de proximidad y prevención barrial', 'Veredas accesibles, iluminación y plazas barriales', 'Presupuestos participativos y datos abiertos']],
  ['Socialdemocracia', ['Fondo solidario mixto para pensiones', 'Fortalecer la atención primaria y la salud mental', 'Salario mínimo de $650.000 con apoyo a pymes']],
  ['Liberalismo social', ['Simplificación de trámites y protección de datos', 'Libre elección de prestadores con subsidio focalizado', 'Ampliar garantías de libertad de conciencia y asociación']],
  ['Conservadurismo', ['Control fronterizo y registro de ingreso', 'Cotización adicional en cuentas individuales heredables', 'Regla fiscal y evaluación de programas públicos']],
  ['Ecologismo', ['Protección de cuencas y humedales urbanos', 'Transición energética con empleos para zonas de sacrificio', 'Transporte público rural y buses eléctricos']],
  ['Regionalismo', ['Transferencia de competencias y recursos a regiones', 'Agua rural e infraestructura de adaptación a sequías', 'Concesiones para mejorar la conectividad regional']],
  ['Izquierda sindical', ['Negociación colectiva sectorial', 'Impuesto progresivo al patrimonio', 'Seguro nacional universal de salud']],
  ['Liberalismo económico', ['Rebaja del impuesto corporativo al 23%', 'Ventanilla rápida de permisos para inversión', 'Flexibilidad horaria pactada y capacitación laboral']],
].map(([label, names]) => ({ label, ids: names.map(name => POLICIES_CATALOG.find(policy => policy.name === name).id) }));

export function programPosition(ids) {
  const selected = ids.map(id => POLICIES_CATALOG.find(policy => policy.id === id)).filter(Boolean);
  const average = axis => selected.reduce((sum, policy) => sum + policy[axis], 0) / (selected.length || 1);
  const economy = average('economy');
  const authority = average('authority');
  const model = economy < -0.5 ? 'Más intervención pública' : economy > 0.5 ? 'Más orientado al mercado' : 'Economía mixta';
  const order = authority < -0.5 ? 'Más libertades y participación' : authority > 0.5 ? 'Más énfasis en autoridad' : 'Balance entre autoridad y libertades';
  return { x: 50 + economy * 21, y: 50 - authority * 21, label: `${model} · ${order}` };
}
