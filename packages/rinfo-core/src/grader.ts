import type { Programa, Sent } from './ast';
import { check } from './checker';
import type { RInfoError } from './errors';
import { tokenize } from './lexer';
import { parse } from './parser';
import { Ejecucion, type Resultado } from './runtime';
import { construirEscenario } from './scenario';
import type { Ejercicio, EjercicioPrograma, Escenario, Observable } from './types';

export type Compilacion = { programa?: Programa; errores: RInfoError[] };

/** Lexer + parser + chequeo semántico. Devuelve todos los errores ordenados por línea. */
export function compilar(codigo: string): Compilacion {
  const lex = tokenize(codigo);
  const par = parse(lex.tokens);
  const errores = [...lex.errores, ...par.errores];
  if (par.programa && par.errores.length === 0) errores.push(...check(par.programa));
  errores.sort((a, b) => a.linea - b.linea || a.columna - b.columna);
  return { programa: errores.length ? undefined : par.programa, errores };
}

export function ejecutar(programa: Programa, escenario: Escenario, semilla = 1): Resultado {
  const { ciudad, bolsa } = construirEscenario(escenario, semilla);
  return new Ejecucion(programa, ciudad, bolsa).ejecutarTodo();
}

/** Cuántas ciudades distintas se prueban por cada escenario aleatorio. */
export const SEMILLAS_POR_ESCENARIO = 3;

function corridas(e: Ejercicio): { escenario: Escenario; semilla: number; nombre: string }[] {
  return e.escenarios.flatMap((esc, i) => {
    const nombre = esc.nombre ?? `Ciudad al azar ${i + 1}`;
    if (!esc.aleatorio) return [{ escenario: esc, semilla: 1, nombre }];
    return Array.from({ length: SEMILLAS_POR_ESCENARIO }, (_, k) => ({
      escenario: esc, semilla: 1000 * (i + 1) + k, nombre: `${nombre} (#${k + 1})`,
    }));
  });
}

export type ResultadoEscenario = {
  nombre: string;
  aprobado: boolean;
  diferencias: string[];
  alumno: Resultado;
  esperado: Resultado;
};

export type Correccion =
  | { estado: 'no-compila'; errores: RInfoError[] }
  | { estado: 'corregido'; aprobado: boolean; escenarios: ResultadoEscenario[]; requisitos: string[] };

const NOMBRE: Record<Observable, string> = {
  informa: 'Lo que informa', posicionFinal: 'La esquina donde termina', recorrido: 'El recorrido',
  ciudad: 'Cómo queda la ciudad', bolsa: 'Lo que queda en la bolsa',
};

const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function describirDiferencia(o: Observable, a: Resultado, e: Resultado): string {
  switch (o) {
    case 'informa': return `${NOMBRE[o]} no coincide: informaste [${a.informes.join(', ') || 'nada'}] y se esperaba [${e.informes.join(', ') || 'nada'}].`;
    case 'posicionFinal': return `${NOMBRE[o]} no coincide: terminaste en (${a.posicionFinal}) y se esperaba (${e.posicionFinal}).`;
    case 'bolsa': return `${NOMBRE[o]} no coincide: ${a.bolsa.flores} flores y ${a.bolsa.papeles} papeles, se esperaban ${e.bolsa.flores} y ${e.bolsa.papeles}.`;
    case 'recorrido': {
      const k = a.recorrido.findIndex((p, i) => !igual(p, e.recorrido[i]));
      const idx = k < 0 ? Math.min(a.recorrido.length, e.recorrido.length) : k;
      return `${NOMBRE[o]} se separa del esperado en el paso ${idx}: (${a.recorrido[idx] ?? 'fin'}) en lugar de (${e.recorrido[idx] ?? 'fin'}).`;
    }
    case 'ciudad': {
      const ka = new Map(a.ciudad.map(([av, ca, f, p]) => [`${av},${ca}`, [f, p]]));
      const ke = new Map(e.ciudad.map(([av, ca, f, p]) => [`${av},${ca}`, [f, p]]));
      for (const k of new Set([...ka.keys(), ...ke.keys()])) {
        const x = ka.get(k) ?? [0, 0], y = ke.get(k) ?? [0, 0];
        if (!igual(x, y)) return `${NOMBRE[o]} no coincide: en (${k}) quedaron ${x[0]} flores y ${x[1]} papeles, y se esperaban ${y[0]} y ${y[1]}.`;
      }
      return `${NOMBRE[o]} no coincide.`;
    }
  }
}

function contarUsos(p: Programa) {
  const llamados = new Set<string>();
  const visitar = (ss: Sent[]) => ss.forEach((s) => {
    if (s.k === 'llamada') llamados.add(s.nombre);
    if (s.k === 'si') { visitar(s.entonces); if (s.sino) visitar(s.sino); }
    if (s.k === 'mientras' || s.k === 'repetir') visitar(s.cuerpo);
  });
  p.procesos.forEach((pr) => visitar(pr.cuerpo));
  p.robots.forEach((r) => visitar(r.cuerpo));
  return llamados;
}

function requisitos(p: Programa, e: EjercicioPrograma, codigo: string): string[] {
  const usa = e.validaciones.usa;
  if (!usa) return [];
  const fallas: string[] = [];
  const usados = contarUsos(p);
  const procesosUsados = p.procesos.filter((pr) => usados.has(pr.nombre)).length;
  if (usa.procesosMin && procesosUsados < usa.procesosMin) {
    fallas.push(`Hay que modularizar: se piden al menos ${usa.procesosMin} proceso(s) usados y hay ${procesosUsados}.`);
  }
  for (const clase of usa.parametros ?? []) {
    if (!p.procesos.some((pr) => pr.params.some((x) => x.clase === clase))) fallas.push(`Se pide al menos un parámetro ${clase}.`);
  }
  for (const w of usa.prohibido ?? []) {
    if (new RegExp(`\\b${w}\\b`).test(codigo)) fallas.push(`En este ejercicio no se puede usar ${w}.`);
  }
  return fallas;
}

const referencias = new Map<string, Programa>();
function referencia(e: EjercicioPrograma): Programa {
  let p = referencias.get(e.id);
  if (!p) {
    const c = compilar(e.solucion.join('\n'));
    if (!c.programa) throw new Error(`La solución de referencia de ${e.id} no compila: ${c.errores[0]?.mensaje}`);
    p = c.programa;
    referencias.set(e.id, p);
  }
  return p;
}

/** Corrige el código del alumno contra la solución de referencia del ejercicio. */
export function corregir(codigo: string, e: EjercicioPrograma): Correccion {
  const c = compilar(codigo);
  if (!c.programa) return { estado: 'no-compila', errores: c.errores };
  const ref = referencia(e);
  const escenarios = corridas(e).map(({ escenario, semilla, nombre }): ResultadoEscenario => {
    const alumno = ejecutar(c.programa!, escenario, semilla);
    const esperado = ejecutar(ref, escenario, semilla);
    const diferencias: string[] = [];
    if (alumno.error) diferencias.push(`Error al ejecutar (línea ${alumno.error.linea}): ${alumno.error.mensaje}`);
    else if (esperado.error) diferencias.push('La solución de referencia falla en este escenario: revisá el ejercicio.');
    else for (const o of e.validaciones.compararConReferencia) {
      const a = o === 'informa' ? alumno.informes : o === 'posicionFinal' ? alumno.posicionFinal : o === 'recorrido' ? alumno.recorrido : o === 'ciudad' ? alumno.ciudad : alumno.bolsa;
      const b = o === 'informa' ? esperado.informes : o === 'posicionFinal' ? esperado.posicionFinal : o === 'recorrido' ? esperado.recorrido : o === 'ciudad' ? esperado.ciudad : esperado.bolsa;
      if (!igual(a, b)) diferencias.push(describirDiferencia(o, alumno, esperado));
    }
    return { nombre, aprobado: diferencias.length === 0, diferencias, alumno, esperado };
  });
  const req = requisitos(c.programa, e, codigo);
  return { estado: 'corregido', aprobado: req.length === 0 && escenarios.every((s) => s.aprobado), escenarios, requisitos: req };
}

/** Para ejercicios "¿Qué hace?": calcula la respuesta correcta de cada escenario. */
export function respuestasQueHace(programa: string[], escenarios: Escenario[]) {
  const c = compilar(programa.join('\n'));
  if (!c.programa) throw new Error(`El programa no compila: ${c.errores[0]?.mensaje}`);
  return escenarios.map((esc, i) => ({ nombre: esc.nombre ?? `Escenario ${i + 1}`, resultado: ejecutar(c.programa!, esc, 1000 * (i + 1)) }));
}
