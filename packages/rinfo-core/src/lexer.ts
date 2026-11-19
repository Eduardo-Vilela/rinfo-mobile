import { err, type RInfoError } from './errors';

export type TokenType =
  | 'IDENT' | 'NUMERO' | 'TEXTO'
  | 'ASIGNAR' | 'DOSPUNTOS' | 'PUNTOYCOMA' | 'COMA' | 'PAREN_A' | 'PAREN_C'
  | 'MAS' | 'MENOS' | 'POR' | 'DIV'
  | 'IGUAL' | 'DISTINTO' | 'MENOR' | 'MAYOR' | 'MENOR_IGUAL' | 'MAYOR_IGUAL'
  | 'Y' | 'O' | 'NO'
  | 'NEWLINE' | 'INDENT' | 'DEDENT' | 'EOF';

export type Token = { type: TokenType; value: string; linea: number; columna: number };

/** Cantidad de columnas que agrega cada nivel de sangría (sección 2.2.3 del material). */
export const SANGRIA = 2;

const SIMBOLOS: [string, TokenType][] = [
  [':=', 'ASIGNAR'], ['<=', 'MENOR_IGUAL'], ['>=', 'MAYOR_IGUAL'], ['<>', 'DISTINTO'],
  [':', 'DOSPUNTOS'], [';', 'PUNTOYCOMA'], [',', 'COMA'], ['(', 'PAREN_A'], [')', 'PAREN_C'],
  ['+', 'MAS'], ['-', 'MENOS'], ['*', 'POR'], ['/', 'DIV'], ['=', 'IGUAL'], ['<', 'MENOR'],
  ['>', 'MAYOR'], ['&', 'Y'], ['|', 'O'], ['~', 'NO'],
];

/** Reemplaza comentarios {…} por espacios (respetando saltos de línea) y normaliza comillas. */
function limpiar(fuente: string, errores: RInfoError[]): string {
  const src = fuente.replace(/\r\n?/g, '\n').replace(/[‘’‚′]/g, "'").replace(/[“”]/g, '"');
  let out = '';
  let dentro = false;
  let linea = 1, col = 1, lineaInicio = 0, colInicio = 0;
  for (const ch of src) {
    if (!dentro && ch === '{') { dentro = true; lineaInicio = linea; colInicio = col; out += ' '; }
    else if (dentro && ch === '}') { dentro = false; out += ' '; }
    else if (dentro) out += ch === '\n' ? '\n' : ' ';
    else if (ch === '}') { errores.push(err('lexico', linea, col, 'Hay una llave "}" que cierra un comentario que nunca se abrió.')); out += ' '; }
    else out += ch;
    if (ch === '\n') { linea++; col = 1; } else col++;
  }
  if (dentro) errores.push(err('lexico', lineaInicio, colInicio, 'Este comentario nunca se cierra: falta la llave "}".'));
  return out;
}

export function tokenize(fuente: string): { tokens: Token[]; errores: RInfoError[] } {
  const errores: RInfoError[] = [];
  const tokens: Token[] = [];
  const lineas = limpiar(fuente, errores).split('\n');
  const pila = [0];

  lineas.forEach((texto, i) => {
    const nro = i + 1;
    if (texto.trim() === '') return;

    // Sangría
    const m = /^[ \t]*/.exec(texto)![0];
    if (m.includes('\t')) {
      errores.push(err('lexico', nro, m.indexOf('\t') + 1, 'Hay un tabulador en la sangría. Usá espacios: cada nivel son 2 columnas.'));
    }
    const sangria = m.replace(/\t/g, ' '.repeat(SANGRIA)).length;
    const actual = pila[pila.length - 1];
    if (sangria > actual) {
      if (sangria !== actual + SANGRIA) {
        errores.push(err('lexico', nro, 1, `Sangría incorrecta: hay ${sangria} espacios y se esperaban ${actual + SANGRIA}. Cada nivel agrega 2 columnas.`));
      }
      pila.push(sangria);
      tokens.push({ type: 'INDENT', value: '', linea: nro, columna: 1 });
    } else if (sangria < actual) {
      while (pila.length > 1 && sangria < pila[pila.length - 1]) {
        pila.pop();
        tokens.push({ type: 'DEDENT', value: '', linea: nro, columna: 1 });
      }
      if (sangria !== pila[pila.length - 1]) {
        errores.push(err('lexico', nro, 1, `Sangría incorrecta: hay ${sangria} espacios y no coincide con ningún bloque abierto (se esperaban ${pila[pila.length - 1]}).`));
        pila[pila.length - 1] = sangria;
      }
    }

    // Tokens de la línea
    let c = m.length;
    while (c < texto.length) {
      const ch = texto[c];
      const col = c + 1;
      if (ch === ' ' || ch === '\t') { c++; continue; }
      if (/[0-9]/.test(ch)) {
        let j = c; while (j < texto.length && /[0-9]/.test(texto[j])) j++;
        tokens.push({ type: 'NUMERO', value: texto.slice(c, j), linea: nro, columna: col });
        c = j; continue;
      }
      if (/[A-Za-zÁÉÍÓÚáéíóúÑñ_]/.test(ch)) {
        let j = c; while (j < texto.length && /[A-Za-z0-9ÁÉÍÓÚáéíóúÑñ_]/.test(texto[j])) j++;
        let palabra = texto.slice(c, j);
        // R-info es el único identificador con guión (nombre del robot en el material).
        if (palabra === 'R' && texto.slice(j, j + 5) === '-info' && !/[A-Za-z0-9_]/.test(texto[j + 5] ?? '')) {
          palabra = 'R-info'; j += 5;
        }
        tokens.push({ type: 'IDENT', value: palabra, linea: nro, columna: col });
        c = j; continue;
      }
      if (ch === "'" || ch === '"') {
        const fin = texto.indexOf(ch, c + 1);
        if (fin < 0) {
          errores.push(err('lexico', nro, col, 'El texto entre comillas no se cierra en esta línea.'));
          c = texto.length; continue;
        }
        tokens.push({ type: 'TEXTO', value: texto.slice(c + 1, fin), linea: nro, columna: col });
        c = fin + 1; continue;
      }
      const sim = SIMBOLOS.find(([s]) => texto.startsWith(s, c));
      if (sim) {
        tokens.push({ type: sim[1], value: sim[0], linea: nro, columna: col });
        c += sim[0].length; continue;
      }
      errores.push(err('lexico', nro, col, `El símbolo "${ch}" no existe en el lenguaje del robot.`));
      c++;
    }
    tokens.push({ type: 'NEWLINE', value: '', linea: nro, columna: texto.length + 1 });
  });

  const ultima = lineas.length;
  while (pila.length > 1) { pila.pop(); tokens.push({ type: 'DEDENT', value: '', linea: ultima, columna: 1 }); }
  tokens.push({ type: 'EOF', value: '', linea: ultima, columna: 1 });
  return { tokens, errores };
}
