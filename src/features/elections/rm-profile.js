export const RM_PROFILE = 'rm-reference';
export const CLASSIC_PROFILE = 'classic';
export const RM_DATA_VERSION = 'rm-2021-2024-2025-v1';

const core = [
  ['Chacabuco', 2, [['Colina',8],['Lampa',8],['Tiltil',6]]],
  ['Cordillera', 3, [['Pirque',6],['Puente Alto',10],['San José de Maipo',6]]],
  ['Maipo', 3, [['Buin',8],['Calera de Tango',6],['Paine',6],['San Bernardo',10]]],
  ['Melipilla', 2, [['Alhué',6],['Curacaví',6],['María Pinto',6],['Melipilla',8],['San Pedro',6]]],
  ['Santiago I', 3, [['Conchalí',8],['Huechuraba',8],['Pudahuel',10],['Quilicura',10],['Renca',8]]],
  ['Santiago II', 4, [['Cerro Navia',8],['Independencia',8],['Lo Prado',8],['Quinta Normal',8],['Recoleta',8],['Santiago',10]]],
  ['Santiago III', 3, [['Cerrillos',6],['Estación Central',8],['Maipú',10]]],
  ['Santiago IV', 4, [['La Reina',8],['Las Condes',10],['Lo Barnechea',8],['Ñuñoa',10],['Providencia',10],['Vitacura',8]]],
  ['Santiago V', 4, [['La Florida',10],['La Granja',8],['Macul',8],['Peñalolén',10],['San Joaquín',8]]],
  ['Santiago VI', 4, [['El Bosque',8],['La Cisterna',8],['La Pintana',8],['Lo Espejo',8],['Pedro Aguirre Cerda',8],['San Miguel',8],['San Ramón',8]]],
  ['Talagante', 2, [['El Monte',6],['Isla de Maipo',6],['Padre Hurtado',6],['Peñaflor',8],['Talagante',6]]],
];

export const RM_COMMUNES = Object.fromEntries(core.flatMap(([constituency, coreSeats, communes]) =>
  communes.map(([commune, councilSeats]) => [commune, {
    constituency, coreSeats, councilSeats, province: constituency.startsWith('Santiago ') ? 'Santiago' : constituency,
    senate: 7,
  }])));

export function profileAllows(profile, region, office) {
  return profile !== RM_PROFILE || (region === 'rm' && office !== 'presidente');
}

export function profileSeats(profile, player, office) {
  if (profile !== RM_PROFILE) return undefined;
  const entry = RM_COMMUNES[player.commune];
  return office === 'concejal' ? entry?.councilSeats : office === 'core' ? entry?.coreSeats : undefined;
}
