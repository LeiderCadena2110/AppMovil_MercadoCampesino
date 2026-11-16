// Municipios de Nariño con el centro aproximado de su cabecera (WGS84).
// La migración 0007 los carga en bases existentes; el seed, en bases nuevas.
export const MUNICIPIOS = [
  ['Pasto', 1.2136, -77.2811], ['Ipiales', 0.8303, -77.6444], ['Túquerres', 1.087, -77.619],
  ['La Unión', 1.6044, -77.1311], ['Sandoná', 1.2847, -77.4717], ['Buesaco', 1.3815, -77.157],
  ['Tangua', 1.0944, -77.3939], ['Yacuanquer', 1.115, -77.4022], ['Samaniego', 1.3383, -77.595],
  ['La Florida', 1.2981, -77.4061], ['Chachagüí', 1.36, -77.2833], ['Consacá', 1.2081, -77.4658],
];

/** Límites aproximados del departamento de Nariño (para validar la ubicación de una finca) */
export const NARINO = { latMin: 0.3, latMax: 2.7, lngMin: -79.1, lngMax: -76.8 };
