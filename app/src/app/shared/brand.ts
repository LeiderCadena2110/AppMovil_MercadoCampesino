/**
 * Símbolo de Minga App: el volcán Galeras con su cráter, el surco de la tierra
 * y una planta que nace al pie del volcán. Se usa en la animación de entrada,
 * en la bienvenida y (como SVG) en app/assets/icon.svg para el ícono del APK.
 * Coordenadas en un lienzo de 200 × 200.
 */
export const LOGO = {
  /** Silueta del Galeras: laderas anchas y cráter con dos bordes */
  volcan: 'M16 150 C50 120 66 88 82 70 L92 63 L100 70 L108 63 L118 70 C134 88 150 120 184 150',
  /** Línea de la tierra y dos surcos de cultivo */
  tierra: 'M12 150 H188',
  surco1: 'M44 166 Q100 156 156 166',
  surco2: 'M66 178 Q100 171 134 178',
  /** Tallo que nace de la tierra y sube por el centro del volcán */
  tallo: 'M100 150 C100 134 100 120 100 100',
  hojaIzquierda: 'M100 126 C86 125 73 115 70 100 C86 99 98 109 100 126 Z',
  hojaDerecha: 'M100 112 C114 108 127 96 130 81 C114 83 102 94 100 112 Z',
} as const;

export const ESLOGAN = 'Del campo a tu mesa, sin intermediarios';
