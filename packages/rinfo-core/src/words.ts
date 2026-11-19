// Vocabulario del lenguaje tal como lo define el material del curso de ingreso.
export const KEYWORDS = [
  'programa', 'procesos', 'proceso', 'areas', 'robots', 'robot', 'variables',
  'comenzar', 'fin', 'si', 'sino', 'mientras', 'repetir', 'numero', 'boolean',
] as const;

export const PRIMITIVAS = [
  'mover', 'derecha', 'tomarFlor', 'tomarPapel', 'depositarFlor', 'depositarPapel',
] as const;

export const SISTEMA = [
  'Pos', 'Informar', 'Iniciar', 'AsignarArea', 'AreaC',
  'PosAv', 'PosCa', 'HayFlorEnLaEsquina', 'HayPapelEnLaEsquina',
  'HayFlorEnLaBolsa', 'HayPapelEnLaBolsa',
] as const;

export const SENSORES = ['PosAv', 'PosCa', 'HayFlorEnLaEsquina', 'HayPapelEnLaEsquina', 'HayFlorEnLaBolsa', 'HayPapelEnLaBolsa'] as const;

export const TODAS: readonly string[] = [...KEYWORDS, ...PRIMITIVAS, ...SISTEMA, 'V', 'F', 'E', 'ES'];

const RESERVADAS = new Set<string>(TODAS);
export const esReservada = (w: string) => RESERVADAS.has(w);

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** Devuelve la palabra del lenguaje que el alumno probablemente quiso escribir. */
export function sugerir(palabra: string, candidatas: readonly string[] = TODAS): string | undefined {
  const exactaSinCase = candidatas.find((c) => c.toLowerCase() === palabra.toLowerCase() && c !== palabra);
  if (exactaSinCase) return exactaSinCase;
  if (palabra.length < 4) return undefined;
  let mejor: string | undefined;
  let dist = 3;
  for (const c of candidatas) {
    const d = levenshtein(palabra.toLowerCase(), c.toLowerCase());
    if (d < dist) { dist = d; mejor = c; }
  }
  return mejor && mejor !== palabra ? mejor : undefined;
}
