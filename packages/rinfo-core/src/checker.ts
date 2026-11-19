import type { Decl, Expr, Param, Proceso, Programa, Sent, Tipo } from './ast';
import { err, type RInfoError } from './errors';
import { PRIMITIVAS, SISTEMA, esReservada, sugerir } from './words';

type Simbolo = { tipo: Tipo; clase: 'var' | 'E' | 'ES' };
type Ambito = Map<string, Simbolo>;

export function check(p: Programa): RInfoError[] {
  const errores: RInfoError[] = [];
  const e = (n: { linea: number; columna: number }, m: string, s?: string) => errores.push(err('semantico', n.linea, n.columna, m, s));
  const procesos = new Map<string, Proceso>();

  for (const pr of p.procesos) {
    if (esReservada(pr.nombre)) e(pr, `"${pr.nombre}" es una palabra del lenguaje y no puede ser el nombre de un proceso.`);
    else if (procesos.has(pr.nombre)) e(pr, `El proceso "${pr.nombre}" está declarado dos veces.`);
    else procesos.set(pr.nombre, pr);
  }

  function ambito(decls: (Decl | Param)[]): Ambito {
    const a: Ambito = new Map();
    for (const d of decls) {
      if (esReservada(d.nombre)) e(d, `"${d.nombre}" es una palabra del lenguaje y no puede usarse como nombre de variable.`);
      else if (a.has(d.nombre)) e(d, `"${d.nombre}" está declarado dos veces.`);
      else a.set(d.nombre, { tipo: d.tipo, clase: 'clase' in d ? d.clase : 'var' });
    }
    return a;
  }

  function tipoDe(x: Expr, a: Ambito): Tipo | 'texto' | undefined {
    switch (x.k) {
      case 'num': return 'numero';
      case 'bool': return 'boolean';
      case 'texto': return 'texto';
      case 'sensor': return x.nombre === 'PosAv' || x.nombre === 'PosCa' ? 'numero' : 'boolean';
      case 'var': {
        const s = a.get(x.nombre);
        if (!s) {
          const sug = sugerir(x.nombre, [...a.keys(), ...SISTEMA]);
          e(x, `La variable "${x.nombre}" no está declarada.`, sug ? `¿Quisiste escribir "${sug}"?` : 'Declarala en la sección "variables".');
          return undefined;
        }
        return s.tipo;
      }
      case 'no': {
        const t = tipoDe(x.e, a);
        if (t && t !== 'boolean') e(x, 'La negación "~" solo se aplica a condiciones (boolean).');
        return 'boolean';
      }
      case 'neg': {
        const t = tipoDe(x.e, a);
        if (t && t !== 'numero') e(x, 'El signo "-" solo se aplica a números.');
        return 'numero';
      }
      case 'bin': {
        const ta = tipoDe(x.a, a), tb = tipoDe(x.b, a);
        const pide = (t: Tipo, que: string) => {
          if (ta && ta !== t) e(x.a, `"${x.op}" ${que}.`);
          if (tb && tb !== t) e(x.b, `"${x.op}" ${que}.`);
        };
        if ('+-*/'.includes(x.op)) { pide('numero', 'opera con números'); return 'numero'; }
        if (x.op === '&' || x.op === '|') { pide('boolean', 'une condiciones (boolean)'); return 'boolean'; }
        if (x.op === '=' || x.op === '<>') {
          if (ta && tb && ta !== tb) e(x, `No se puede comparar un ${ta} con un ${tb}.`);
          return 'boolean';
        }
        pide('numero', 'compara números');
        return 'boolean';
      }
    }
  }

  function exigir(x: Expr, a: Ambito, t: Tipo, donde: string) {
    const real = tipoDe(x, a);
    if (real && real !== t) e(x, `${donde} necesita ${t === 'boolean' ? 'una condición (boolean)' : 'un número'}, pero recibe ${real === 'texto' ? 'un texto' : `un ${real}`}.`);
  }

  function sentencias(ss: Sent[], a: Ambito) {
    for (const s of ss) {
      switch (s.k) {
        case 'primitiva': break;
        case 'pos': exigir(s.av, a, 'numero', 'Pos'); exigir(s.ca, a, 'numero', 'Pos'); break;
        case 'informar': s.args.forEach((x) => tipoDe(x, a)); break;
        case 'asignar': {
          const sim = a.get(s.nombre);
          if (esReservada(s.nombre)) { e(s, `"${s.nombre}" es del sistema y no se le puede asignar un valor.`); break; }
          if (!sim) {
            const sug = sugerir(s.nombre, [...a.keys()]);
            e(s, `La variable "${s.nombre}" no está declarada.`, sug ? `¿Quisiste escribir "${sug}"?` : 'Declarala en la sección "variables".');
            tipoDe(s.valor, a);
            break;
          }
          if (sim.clase === 'E') e(s, `"${s.nombre}" es un parámetro de entrada (E) y no se le puede asignar un valor.`, 'Copialo a una variable local y modificá esa.');
          exigir(s.valor, a, sim.tipo, `La variable "${s.nombre}"`);
          break;
        }
        case 'llamada': {
          const pr = procesos.get(s.nombre);
          if (!pr) {
            const sug = sugerir(s.nombre, [...procesos.keys(), ...PRIMITIVAS]);
            e(s, `"${s.nombre}" no es una instrucción ni un proceso declarado.`, sug ? `¿Quisiste escribir "${sug}"?` : undefined);
            break;
          }
          if (pr.params.length !== s.args.length) {
            e(s, `El proceso "${pr.nombre}" recibe ${pr.params.length} parámetro(s) y le estás pasando ${s.args.length}.`);
            break;
          }
          pr.params.forEach((par, k) => {
            const arg = s.args[k];
            if (par.clase === 'ES') {
              if (arg.k !== 'var') { e(arg, `El parámetro "${par.nombre}" es ES: hay que pasarle una variable, no un valor.`); return; }
              const sim = a.get(arg.nombre);
              if (sim?.clase === 'E') e(arg, `"${arg.nombre}" es un parámetro E y no se puede pasar como ES, porque el proceso podría modificarlo.`);
            }
            exigir(arg, a, par.tipo, `El parámetro "${par.nombre}"`);
          });
          break;
        }
        case 'si':
          exigir(s.cond, a, 'boolean', 'La condición del si');
          sentencias(s.entonces, a);
          if (s.sino) sentencias(s.sino, a);
          break;
        case 'mientras': exigir(s.cond, a, 'boolean', 'La condición del mientras'); sentencias(s.cuerpo, a); break;
        case 'repetir': exigir(s.veces, a, 'numero', 'repetir'); sentencias(s.cuerpo, a); break;
      }
    }
  }

  for (const pr of p.procesos) sentencias(pr.cuerpo, ambito([...pr.params, ...pr.variables]));
  for (const r of p.robots) sentencias(r.cuerpo, ambito(r.variables));

  // Estructura del programa principal
  const nombre = { linea: 1, columna: 1 };
  if (p.areas.length === 0) e(nombre, 'Falta declarar el área en la sección "areas": ciudad: AreaC(1,1,100,100).');
  for (const ar of p.areas) {
    const ok = [ar.av1, ar.ca1, ar.av2, ar.ca2].every((n) => n >= 1 && n <= 100) && ar.av1 <= ar.av2 && ar.ca1 <= ar.ca2;
    if (!ok) e(ar, 'Los valores de AreaC tienen que estar entre 1 y 100 y formar un rectángulo válido.');
  }
  const tipos = new Set(p.robots.map((r) => r.nombre));
  const robots = new Set<string>();
  for (const v of p.variables) {
    if (!tipos.has(v.tipo)) e(v, `"${v.tipo}" no es un tipo de robot declarado.`, sugerir(v.tipo, [...tipos]) && `¿Quisiste escribir "${sugerir(v.tipo, [...tipos])}"?`);
    robots.add(v.nombre);
  }
  const areas = new Set(p.areas.map((a) => a.nombre));
  const asignados = new Set<string>(), iniciados = new Set<string>();
  for (const s of p.principal) {
    if (!robots.has(s.robot)) {
      e(s, `"${s.robot}" no es un robot declarado en "variables".`, robots.size === 1 ? `Escribí "${[...robots][0]}".` : undefined);
      continue;
    }
    if (s.k === 'asignarArea') {
      if (!areas.has(s.area)) e(s, `El área "${s.area}" no está declarada.`);
      asignados.add(s.robot);
    } else {
      if (!asignados.has(s.robot)) e(s, `Antes de Iniciar hay que asignarle un área a ${s.robot} con AsignarArea.`);
      exigir(s.av, new Map(), 'numero', 'Iniciar'); exigir(s.ca, new Map(), 'numero', 'Iniciar');
      iniciados.add(s.robot);
    }
  }
  for (const r of robots) if (!iniciados.has(r)) e(nombre, `El robot ${r} nunca se inicia: falta Iniciar(${r},1,1).`);
  return errores;
}
