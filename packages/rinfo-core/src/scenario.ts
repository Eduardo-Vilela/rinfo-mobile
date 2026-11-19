import { Ciudad, type Bolsa } from './city';
import type { Escenario, Restriccion, Zona } from './types';

export function prng(semilla: number) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const entre = (rnd: () => number, [min, max]: [number, number]) => min + Math.floor(rnd() * (max - min + 1));

function esquinas([a1, c1, a2, c2]: Zona): [number, number][] {
  const r: [number, number][] = [];
  for (let a = Math.min(a1, a2); a <= Math.max(a1, a2); a++)
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) r.push([a, c]);
  return r;
}

/** Ajusta la ciudad para que cumpla una restricción, agregando o quitando objetos al azar. */
function cumplir(ciudad: Ciudad, r: Restriccion, rnd: () => number, maxPorEsquina: { flores: number; papeles: number }) {
  const zona = esquinas(r.zona);
  const ajustar = (obj: 'flores' | 'papeles', lim?: { min?: number; max?: number }) => {
    if (!lim) return;
    const total = () => zona.reduce((s, [a, c]) => s + ciudad.get(a, c)[obj], 0);
    let guard = 0;
    while (lim.min !== undefined && total() < lim.min && guard++ < 10000) {
      const [a, c] = zona[Math.floor(rnd() * zona.length)];
      if (ciudad.get(a, c)[obj] < Math.max(1, maxPorEsquina[obj])) ciudad.sumar(a, c, obj, 1);
    }
    while (lim.max !== undefined && total() > lim.max && guard++ < 20000) {
      const [a, c] = zona[Math.floor(rnd() * zona.length)];
      if (ciudad.get(a, c)[obj] > 0) ciudad.sumar(a, c, obj, -1);
    }
  };
  ajustar('flores', r.totalFlores);
  ajustar('papeles', r.totalPapeles);
  const vacias = (obj: 'flores' | 'papeles', lim?: { min?: number }) => {
    if (!lim?.min) return;
    let n = zona.filter(([a, c]) => ciudad.get(a, c)[obj] === 0).length;
    while (n < lim.min) {
      const [a, c] = zona[Math.floor(rnd() * zona.length)];
      if (ciudad.get(a, c)[obj] > 0) { ciudad.set(a, c, { ...ciudad.get(a, c), [obj]: 0 }); n++; }
    }
  };
  vacias('papeles', r.esquinasSinPapel);
  if (r.esquinasVacias?.min) {
    const vacia = ([a, c]: [number, number]) => ciudad.get(a, c).flores === 0 && ciudad.get(a, c).papeles === 0;
    let n = zona.filter(vacia).length;
    while (n < r.esquinasVacias.min) {
      const e = zona[Math.floor(rnd() * zona.length)];
      if (!vacia(e)) { ciudad.set(e[0], e[1], { flores: 0, papeles: 0 }); n++; }
    }
  }
  vacias('flores', r.esquinasSinFlor);
}

export function construirEscenario(e: Escenario, semilla: number): { ciudad: Ciudad; bolsa: Bolsa } {
  const rnd = prng(semilla);
  const ciudad = new Ciudad();
  const bolsa: Bolsa = { flores: 0, papeles: 0 };
  const al = e.aleatorio;
  if (al) {
    const df = al.densidad?.flores ?? 1, dp = al.densidad?.papeles ?? 1;
    for (const [a, c] of esquinas(al.zona)) {
      const f = al.flores ? entre(rnd, al.flores) : 0;
      const p = al.papeles ? entre(rnd, al.papeles) : 0;
      ciudad.set(a, c, { flores: rnd() < df ? f : 0, papeles: rnd() < dp ? p : 0 });
    }
    for (const r of al.restricciones ?? []) {
      cumplir(ciudad, r, rnd, { flores: al.flores?.[1] ?? 1, papeles: al.papeles?.[1] ?? 1 });
    }
    if (al.bolsa?.flores) bolsa.flores = entre(rnd, al.bolsa.flores);
    if (al.bolsa?.papeles) bolsa.papeles = entre(rnd, al.bolsa.papeles);
  }
  for (const [a, c, n] of e.flores ?? []) ciudad.set(a, c, { ...ciudad.get(a, c), flores: n });
  for (const [a, c, n] of e.papeles ?? []) ciudad.set(a, c, { ...ciudad.get(a, c), papeles: n });
  if (e.bolsa?.flores !== undefined) bolsa.flores = e.bolsa.flores;
  if (e.bolsa?.papeles !== undefined) bolsa.papeles = e.bolsa.papeles;
  return { ciudad, bolsa };
}
