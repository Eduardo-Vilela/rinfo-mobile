import type { Area, Expr, Programa, Proceso, Sent } from './ast';
import { Ciudad, type Bolsa } from './city';
import { err, RInfoException, type RInfoError } from './errors';

type Valor = number | boolean | string;
type Celda = { v: Valor | undefined; nombre: string };
type Entorno = Map<string, Celda>;

export type Esquina = [av: number, ca: number];

export type EstadoRobot = {
  nombre: string;
  av: number;
  ca: number;
  dir: 0 | 1 | 2 | 3; // 0 norte, 1 este, 2 sur, 3 oeste
  bolsa: Bolsa;
  area: Area;
  recorrido: Esquina[];
  terminado: boolean;
};

export type Paso = { robot: string; linea: number; accion: string };

export type Resultado = {
  informes: string[];
  posicionFinal: Esquina;
  recorrido: Esquina[];
  ciudad: [number, number, number, number][];
  bolsa: Bolsa;
  error?: RInfoError;
  pasos: number;
};

export const LIMITE_PASOS = 200_000;
const MAX = 2147483647;
const DX = [0, 1, 0, -1], DY = [1, 0, -1, 0];

/**
 * Ejecución paso a paso. Cada robot es un generador que se detiene después de cada
 * instrucción primitiva, así la interfaz puede mostrar el recorrido y la concurrencia
 * se simula avanzando un paso de cada robot por turno.
 */
export class Ejecucion {
  readonly ciudad: Ciudad;
  readonly robots: EstadoRobot[] = [];
  readonly informes: string[] = [];
  error?: RInfoError;
  pasos = 0;
  private gens: Generator<Paso, void>[] = [];
  private turno = 0;

  constructor(private p: Programa, ciudad: Ciudad, bolsaInicial: Bolsa = { flores: 0, papeles: 0 }) {
    this.ciudad = ciudad.clonar();
    const areas = new Map(p.areas.map((a) => [a.nombre, a]));
    const tipos = new Map(p.robots.map((r) => [r.nombre, r]));
    const areaDe = new Map<string, Area>();
    try {
      for (const s of p.principal) {
        if (s.k === 'asignarArea') { areaDe.set(s.robot, areas.get(s.area)!); continue; }
        const v = p.variables.find((x) => x.nombre === s.robot)!;
        const tipo = tipos.get(v.tipo)!;
        const av = this.num(s.av, new Map()), ca = this.num(s.ca, new Map());
        const area = areaDe.get(s.robot)!;
        this.dentro(area, av, ca, s.linea, s.columna, 'Iniciar');
        const r: EstadoRobot = {
          nombre: s.robot, av, ca, dir: 0, area,
          bolsa: this.robots.length === 0 ? { ...bolsaInicial } : { flores: 0, papeles: 0 },
          recorrido: [[av, ca]], terminado: false,
        };
        this.robots.push(r);
        const entorno: Entorno = new Map(tipo.variables.map((d) => [d.nombre, { v: undefined, nombre: d.nombre }]));
        this.gens.push(this.bloque(tipo.cuerpo, entorno, r));
      }
    } catch (e) {
      if (!(e instanceof RInfoException)) throw e;
      this.error = e.error;
    }
  }

  get terminado() { return !!this.error || this.robots.every((r) => r.terminado); }

  /** Avanza una instrucción primitiva (de un robot). Devuelve undefined al terminar. */
  paso(): Paso | undefined {
    if (this.terminado) return undefined;
    for (let intentos = 0; intentos < this.robots.length; intentos++) {
      const k = this.turno++ % this.robots.length;
      const r = this.robots[k];
      if (r.terminado) continue;
      try {
        const res = this.gens[k].next();
        if (res.done) { r.terminado = true; continue; }
        if (++this.pasos > LIMITE_PASOS) {
          this.error = err('ejecucion', res.value.linea, 1, 'El programa no termina: el robot dio demasiados pasos. Revisá que cada mientras tenga una condición que en algún momento sea falsa.');
          return undefined;
        }
        return res.value;
      } catch (e) {
        if (!(e instanceof RInfoException)) throw e;
        this.error = e.error;
        r.terminado = true;
        return undefined;
      }
    }
    return undefined;
  }

  ejecutarTodo(): Resultado {
    while (this.paso());
    const r = this.robots[0];
    return {
      informes: this.informes,
      posicionFinal: r ? [r.av, r.ca] : [1, 1],
      recorrido: r ? r.recorrido : [],
      ciudad: this.ciudad.snapshot(),
      bolsa: r ? { ...r.bolsa } : { flores: 0, papeles: 0 },
      error: this.error,
      pasos: this.pasos,
    };
  }

  // ---------- Intérprete ----------
  private falla(n: { linea: number; columna: number }, m: string): never {
    throw new RInfoException(err('ejecucion', n.linea, n.columna, m));
  }
  private dentro(a: Area, av: number, ca: number, linea: number, columna: number, que: string) {
    if (av < 1 || av > 100 || ca < 1 || ca > 100) this.falla({ linea, columna }, `${que} saca al robot de la ciudad: (${av},${ca}) no existe.`);
    if (av < a.av1 || av > a.av2 || ca < a.ca1 || ca > a.ca2) this.falla({ linea, columna }, `${que} saca al robot de su área: (${av},${ca}).`);
  }

  private *bloque(ss: Sent[], env: Entorno, r: EstadoRobot): Generator<Paso, void> {
    for (const s of ss) yield* this.sentencia(s, env, r);
  }

  private *sentencia(s: Sent, env: Entorno, r: EstadoRobot): Generator<Paso, void> {
    const paso = (accion: string): Paso => ({ robot: r.nombre, linea: s.linea, accion });
    switch (s.k) {
      case 'primitiva': {
        const c = this.ciudad.get(r.av, r.ca);
        switch (s.nombre) {
          case 'mover': {
            const av = r.av + DX[r.dir], ca = r.ca + DY[r.dir];
            this.dentro(r.area, av, ca, s.linea, s.columna, 'mover');
            r.av = av; r.ca = ca; r.recorrido.push([av, ca]);
            break;
          }
          case 'derecha': r.dir = ((r.dir + 1) % 4) as EstadoRobot['dir']; break;
          case 'tomarFlor':
            if (c.flores === 0) this.falla(s, `tomarFlor en (${r.av},${r.ca}), pero en esa esquina no hay flores.`);
            this.ciudad.sumar(r.av, r.ca, 'flores', -1); r.bolsa.flores++; break;
          case 'tomarPapel':
            if (c.papeles === 0) this.falla(s, `tomarPapel en (${r.av},${r.ca}), pero en esa esquina no hay papeles.`);
            this.ciudad.sumar(r.av, r.ca, 'papeles', -1); r.bolsa.papeles++; break;
          case 'depositarFlor':
            if (r.bolsa.flores === 0) this.falla(s, `depositarFlor en (${r.av},${r.ca}), pero la bolsa no tiene flores.`);
            this.ciudad.sumar(r.av, r.ca, 'flores', 1); r.bolsa.flores--; break;
          case 'depositarPapel':
            if (r.bolsa.papeles === 0) this.falla(s, `depositarPapel en (${r.av},${r.ca}), pero la bolsa no tiene papeles.`);
            this.ciudad.sumar(r.av, r.ca, 'papeles', 1); r.bolsa.papeles--; break;
        }
        yield paso(s.nombre);
        return;
      }
      case 'pos': {
        const av = this.num(s.av, env, r), ca = this.num(s.ca, env, r);
        this.dentro(r.area, av, ca, s.linea, s.columna, 'Pos');
        r.av = av; r.ca = ca; r.recorrido.push([av, ca]);
        yield paso('Pos');
        return;
      }
      case 'informar': {
        const vals = s.args.map((x) => this.formato(this.eval(x, env, r)));
        this.informes.push(vals.join(' '));
        yield paso('Informar');
        return;
      }
      case 'asignar': {
        env.get(s.nombre)!.v = this.eval(s.valor, env, r);
        return;
      }
      case 'llamada': {
        const pr = this.p.procesos.find((x) => x.nombre === s.nombre)!;
        yield* this.bloque(pr.cuerpo, this.entornoProceso(pr, s.args, env, r), r);
        return;
      }
      case 'si':
        if (this.bool(s.cond, env, r)) yield* this.bloque(s.entonces, env, r);
        else if (s.sino) yield* this.bloque(s.sino, env, r);
        return;
      case 'mientras': {
        let vueltas = 0;
        while (this.bool(s.cond, env, r)) {
          yield* this.bloque(s.cuerpo, env, r);
          // Un mientras sin primitivas adentro nunca cede el turno: se corta acá.
          if (++vueltas > LIMITE_PASOS) this.falla(s, 'Este mientras no termina nunca: su condición no deja de ser verdadera.');
        }
        return;
      }
      case 'repetir': {
        const n = this.num(s.veces, env, r);
        for (let k = 0; k < n; k++) yield* this.bloque(s.cuerpo, env, r);
        return;
      }
    }
  }

  private entornoProceso(pr: Proceso, args: Expr[], env: Entorno, r: EstadoRobot): Entorno {
    const nuevo: Entorno = new Map();
    pr.params.forEach((par, k) => {
      const a = args[k];
      if (par.clase === 'ES' && a.k === 'var') nuevo.set(par.nombre, env.get(a.nombre)!);
      else nuevo.set(par.nombre, { v: this.eval(a, env, r), nombre: par.nombre });
    });
    for (const d of pr.variables) nuevo.set(d.nombre, { v: undefined, nombre: d.nombre });
    return nuevo;
  }

  private formato(v: Valor): string {
    return typeof v === 'boolean' ? (v ? 'V' : 'F') : String(v);
  }
  private num(x: Expr, env: Entorno, r?: EstadoRobot): number { return this.eval(x, env, r) as number; }
  private bool(x: Expr, env: Entorno, r?: EstadoRobot): boolean { return this.eval(x, env, r) as boolean; }

  private eval(x: Expr, env: Entorno, r?: EstadoRobot): Valor {
    switch (x.k) {
      case 'num': case 'bool': case 'texto': return x.valor;
      case 'var': {
        const c = env.get(x.nombre)!;
        if (c.v === undefined) this.falla(x, `La variable "${x.nombre}" se usa sin haberle dado un valor antes. Inicializala.`);
        return c.v;
      }
      case 'sensor': {
        if (!r) this.falla(x, `${x.nombre} solo se puede usar dentro del robot.`);
        const c = this.ciudad.get(r.av, r.ca);
        switch (x.nombre) {
          case 'PosAv': return r.av;
          case 'PosCa': return r.ca;
          case 'HayFlorEnLaEsquina': return c.flores > 0;
          case 'HayPapelEnLaEsquina': return c.papeles > 0;
          case 'HayFlorEnLaBolsa': return r.bolsa.flores > 0;
          default: return r.bolsa.papeles > 0;
        }
      }
      case 'no': return !this.eval(x.e, env, r);
      case 'neg': return -(this.eval(x.e, env, r) as number);
      case 'bin': {
        if (x.op === '&') return (this.eval(x.a, env, r) as boolean) && (this.eval(x.b, env, r) as boolean);
        if (x.op === '|') return (this.eval(x.a, env, r) as boolean) || (this.eval(x.b, env, r) as boolean);
        const a = this.eval(x.a, env, r), b = this.eval(x.b, env, r);
        let v: Valor;
        switch (x.op) {
          case '+': v = (a as number) + (b as number); break;
          case '-': v = (a as number) - (b as number); break;
          case '*': v = (a as number) * (b as number); break;
          case '/':
            if (b === 0) this.falla(x, 'División por cero.');
            v = Math.trunc((a as number) / (b as number)); break;
          case '=': return a === b;
          case '<>': return a !== b;
          case '<': return a < b;
          case '>': return a > b;
          case '<=': return a <= b;
          default: return a >= b;
        }
        if (v > MAX || v < -MAX) this.falla(x, 'Overflow: el resultado se pasa del máximo que puede guardar un número.');
        return v;
      }
    }
  }
}
