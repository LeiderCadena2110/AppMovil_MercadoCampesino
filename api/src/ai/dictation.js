// Intérprete local de dictados para publicar productos, sin internet ni IA.
// Entiende frases como "papa pastusa a 45 mil la arroba, tengo 40 arrobas"
// o "queso campesino, doce mil pesos la libra, quedan quince".
// Lo usa la API como respaldo cuando Gemini no está disponible o falla.

const sinTildes = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const UNIDADES = [
  ['kg', /\b(kg|kgs|kilo|kilos|kilogramos?)\b/],
  ['libra', /\b(libras?|lb|lbs)\b/],
  ['arroba', /\b(arrobas?)\b/],
  ['bulto', /\b(bultos?)\b/],
  ['atado', /\b(atados?)\b/],
  ['litro', /\b(litros?|lt|lts)\b/],
  ['unidad', /\b(unidad|unidades|und|cada uno|cada una)\b/],
];

// Palabras de producto → nombre de la categoría (se compara sin tildes con las de la base)
const CATEGORIAS = [
  ['tuberculos', ['papa', 'yuca', 'oca', 'olluco', 'ulluco', 'arracacha', 'camote', 'nabo']],
  ['frutas', ['mora', 'lulo', 'tomate de arbol', 'fresa', 'naranja', 'mandarina', 'banano', 'guayaba', 'maracuya', 'granadilla', 'uchuva', 'aguacate', 'pina', 'mango', 'limon', 'papaya', 'curuba', 'chilacuan']],
  ['verduras', ['cebolla', 'zanahoria', 'tomate', 'lechuga', 'repollo', 'brocoli', 'coliflor', 'arveja', 'haba', 'remolacha', 'pimenton', 'pepino', 'zapallo', 'ahuyama', 'acelga', 'espinaca', 'mazorca', 'choclo']],
  ['granos', ['frijol', 'frijoles', 'maiz', 'quinua', 'lenteja', 'garbanzo', 'trigo', 'cebada', 'arroz']],
  ['lacteos', ['queso', 'leche', 'cuajada', 'kumis', 'yogur', 'mantequilla', 'quesillo']],
  ['cafe', ['cafe']],
  ['hierbas', ['cilantro', 'perejil', 'hierbabuena', 'yerbabuena', 'manzanilla', 'cedron', 'oregano', 'albahaca', 'ruda', 'toronjil', 'apio']],
];

// ------------------------------------------------------------- números en palabras

const NUM = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25,
  veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29, treinta: 30, cuarenta: 40, cincuenta: 50,
  sesenta: 60, setenta: 70, ochenta: 80, noventa: 90, cien: 100, ciento: 100, doscientos: 200, doscientas: 200,
  trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500,
  seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800,
  novecientos: 900, novecientas: 900, medio: 0.5, media: 0.5,
};

/** Convierte secuencias de números escritos en palabras a cifras: "cuarenta y cinco mil" → "45000" */
export function palabrasANumeros(texto) {
  const tokens = texto.split(/\s+/);
  const salida = [];
  let actual = null; // { total, grupo }
  const cerrar = () => {
    if (actual) salida.push(String(actual.total + actual.grupo));
    actual = null;
  };
  const num = (t) => NUM[sinTildes(t ?? '')];
  for (let i = 0; i < tokens.length; i++) {
    const t = sinTildes(tokens[i]);
    if (t === 'mil' && !actual && /^\d+([.,]\d+)?$/.test(salida.at(-1) ?? '')) {
      // "45 mil" (cifra + palabra)
      salida.push(String(Math.round(parseFloat(salida.pop().replace(',', '.')) * 1000)));
      continue;
    }
    if (num(t) !== undefined && !(t === 'una' && actual === null && num(tokens[i + 1]) === undefined && tokens[i + 1] !== 'mil')) {
      actual ??= { total: 0, grupo: 0 };
      actual.grupo += num(t);
    } else if (t === 'mil' && actual) {
      actual.total += (actual.grupo || 1) * 1000;
      actual.grupo = 0;
    } else if (t === 'mil' && !actual) {
      actual = { total: 1000, grupo: 0 };
    } else if (t === 'y' && actual && num(tokens[i + 1]) !== undefined) {
      continue;
    } else {
      cerrar();
      salida.push(tokens[i]);
    }
  }
  cerrar();
  return salida.join(' ');
}

/** "45.000", "45,000", "$45000", "45 mil", "4,5 mil" → números */
function normalizarCifras(t) {
  return t
    .replace(/\$\s*/g, ' ')
    .replace(/(\d)[.,](\d{3})(?!\d)/g, '$1$2')
    .replace(/(\d)[.,](\d{3})(?!\d)/g, '$1$2')
    .replace(/(\d+(?:[.,]\d+)?)\s*mil\b/g, (_, n) => String(Math.round(parseFloat(n.replace(',', '.')) * 1000)))
    .replace(/(\d+)\s*k\b/g, (_, n) => String(+n * 1000));
}

const unidadEn = (t) => UNIDADES.find(([, re]) => re.test(t))?.[0] ?? null;

/**
 * Interpreta un dictado. Devuelve los campos que pudo entender (los demás en null).
 * @param {string} texto   lo que dijo el productor (ya convertido a texto por el teléfono)
 * @param {{id:number, nombre:string}[]} categorias  categorías de la base
 */
export function interpretarDictado(texto, categorias = []) {
  // Se conservan las tildes para el nombre ("Café", "Tomate de árbol"); las búsquedas no las necesitan
  let t = texto.toLowerCase().replace(/[¿?¡!;:"]/g, ' ').replace(/\s+/g, ' ').trim();
  t = normalizarCifras(palabrasANumeros(t));

  // Precio: número junto a "pesos", o después de "a / en / vale / cuesta / precio / por"
  let precio = null;
  let resto = t;
  const pPesos = t.match(/(\d+)\s*(pesos|cop)\b/);
  const pUnidad = t.match(/(\d+)\s+(la|el|por|cada|x)\s+(kg|kilo|kilogramo|libra|arroba|bulto|atado|litro|unidad)\b/);
  const pVerbo = t.match(/\b(a|en|vale|cuesta|cuestan|valen|precio(?: de)?|por)\s+(\d+)(?!\s*(kg|kilos?|libras?|arrobas?|bultos?|atados?|litros?|unidades)\b)/);
  const mPrecio = pPesos ? { n: pPesos[1], i: pPesos.index, largo: pPesos[0].length }
    : pVerbo ? { n: pVerbo[2], i: pVerbo.index, largo: pVerbo[0].length }
    : pUnidad ? { n: pUnidad[1], i: pUnidad.index, largo: pUnidad[1].length } : null;
  if (mPrecio && +mPrecio.n >= 50) {
    precio = +mPrecio.n;
    resto = t.slice(0, mPrecio.i) + ' ' + t.slice(mPrecio.i + mPrecio.largo);
  }

  // Unidad de venta: "la arroba", "por libra", "el kilo"; si no, la primera que aparezca
  const venta = resto.match(/\b(la|el|por|cada|x)\s+(kg|kilo|kilogramo|libra|arroba|bulto|atado|litro|unidad)\b/);
  const unidad = venta ? unidadEn(venta[2]) : unidadEn(resto);

  // Existencias: "tengo 40", "quedan 15", "hay 3 bultos", "40 arrobas disponibles"
  let stock = null;
  const s1 = resto.match(/\b(tengo|hay|quedan|queda|disponibles?|cuento con|son|existencias?|stock)\s+(\d+)/);
  const s2 = resto.match(/(\d+)\s+(kg|kilos?|kilogramos?|libras?|arrobas?|bultos?|atados?|litros?|unidades)\b/);
  const s3 = resto.match(/(\d+)\s+(disponibles?)/);
  const nStock = s1?.[2] ?? s2?.[1] ?? s3?.[1];
  if (nStock !== undefined && +nStock <= 100000) stock = +nStock;

  // Nombre: lo que va antes del primer número o palabra de precio/cantidad
  const corte = t.search(/\b(a|en|vale|cuesta|cuestan|valen|precio|por|tengo|hay|quedan|queda|son|la|el|cada)\s+\d|\d|\b(tengo|hay|quedan|precio|vale|cuesta)\b/);
  let nombre = (corte >= 0 ? t.slice(0, corte) : t)
    .replace(/^(vendo|voy a vender|quiero (publicar|vender)|publicar|publico|ofrezco|tengo|hay|nuevo producto)\s+/, '')
    .replace(/\b(de la finca|de mi finca)\b.*$/, '')
    .replace(/[,.\s]+$/, '')
    .replace(/\s+(a|en|la|el|por|de)$/, '')
    .trim();
  // "45 mil la arroba de papa criolla": el nombre va después de la unidad
  if (nombre.length < 2) {
    const despues = t.match(/\b(?:kg|kilos?|libras?|arrobas?|bultos?|atados?|litros?|unidad(?:es)?)\s+de\s+([^\d,.]+)/);
    nombre = despues ? despues[1].replace(/\s+(a|en|la|el|por|tengo|hay|quedan)\b.*$/, '').trim() : '';
  }
  if (nombre.length < 2) nombre = null;
  else nombre = nombre[0].toUpperCase() + nombre.slice(1, 120);

  // Categoría por palabras clave del nombre
  let categoriaId = null;
  if (nombre) {
    const n = sinTildes(nombre);
    // "tomate de árbol" es fruta aunque "tomate" sea verdura: gana la palabra más larga
    const candidatos = CATEGORIAS.flatMap(([cat, ps]) => ps.filter((p) => new RegExp(`\\b${p}`).test(n)).map((p) => [cat, p.length]));
    candidatos.sort((a, b) => b[1] - a[1]);
    const cat = candidatos[0] && categorias.find((c) => sinTildes(c.nombre) === candidatos[0][0]);
    categoriaId = cat?.id ?? null;
  }

  return { nombre, precio, unidad, stock, categoriaId };
}
