import type { Area, Decl, Expr, Param, Principal, Proceso, Programa, Sent, TipoRobot, VarRobot } from './ast';
import { err, type RInfoError } from './errors';
import type { Token, TokenType } from './lexer';
import { PRIMITIVAS, SENSORES, KEYWORDS, sugerir } from './words';

class ParseError extends Error {
  constructor(public readonly e: RInfoError) { super(e.mensaje); }
}

const DESCRIPCION: Partial<Record<TokenType, string>> = {
  NEWLINE: 'el fin de la línea', INDENT: 'un bloque con sangría', DEDENT: 'el fin del bloque', EOF: 'el fin del programa',
  PAREN_A: '"("', PAREN_C: '")"', COMA: '","', DOSPUNTOS: '":"', ASIGNAR: '":="', PUNTOYCOMA: '";"',
};

function describir(t: Token): string {
  if (t.type === 'IDENT' || t.type === 'NUMERO') return `"${t.value}"`;
  if (t.type === 'TEXTO') return `el texto '${t.value}'`;
  return DESCRIPCION[t.type] ?? `"${t.value}"`;
}

export function parse(tokens: Token[]): { programa?: Programa; errores: RInfoError[] } {
  let i = 0;
  const errores: RInfoError[] = [];
  const peek = (o = 0) => tokens[Math.min(i + o, tokens.length - 1)];
  const next = () => tokens[Math.min(i++, tokens.length - 1)];
  const fallo = (t: Token, mensaje: string, sugerencia?: string): never => {
    throw new ParseError(err('sintactico', t.linea, t.columna, mensaje, sugerencia));
  };
  const es = (type: TokenType, value?: string, o = 0) => peek(o).type === type && (value === undefined || peek(o).value === value);
  const esPalabra = (w: string) => es('IDENT', w);

  function esperar(type: TokenType, contexto: string): Token {
    const t = peek();
    if (t.type !== type) fallo(t, `Se esperaba ${DESCRIPCION[type] ?? type} ${contexto}, pero hay ${describir(t)}.`);
    return next();
  }
  function palabra(w: string, contexto: string): Token {
    const t = peek();
    if (t.type === 'IDENT' && t.value === w) return next();
    if (t.type === 'IDENT' && t.value.toLowerCase() === w.toLowerCase()) {
      fallo(t, `"${t.value}" está mal escrito: el lenguaje distingue mayúsculas y minúsculas.`, `Escribí "${w}".`);
    }
    return fallo(t, `Se esperaba la palabra "${w}" ${contexto}, pero hay ${describir(t)}.`);
  }
  function ident(contexto: string): Token {
    const t = peek();
    if (t.type !== 'IDENT') fallo(t, `Se esperaba un nombre ${contexto}, pero hay ${describir(t)}.`);
    return next();
  }
  function finDeLinea(contexto: string) {
    const t = peek();
    if (t.type !== 'NEWLINE') fallo(t, `Sobra ${describir(t)} ${contexto}. Cada instrucción va en su propia línea.`);
    next();
  }
  /** Avanza hasta la próxima línea del mismo nivel, salteando bloques anidados. */
  function sincronizar() {
    while (!es('NEWLINE') && !es('EOF') && !es('DEDENT')) next();
    if (es('NEWLINE')) next();
    if (es('INDENT')) {
      let nivel = 0;
      do {
        if (es('INDENT')) nivel++;
        if (es('DEDENT')) nivel--;
        next();
      } while (nivel > 0 && !es('EOF'));
    }
  }

  // ---------- Expresiones ----------
  type Op = Extract<Expr, { k: 'bin' }>['op'];
  const NIVELES: [TokenType, Op][][] = [
    [['O', '|']],
    [['Y', '&']],
    [['IGUAL', '='], ['DISTINTO', '<>'], ['MENOR', '<'], ['MAYOR', '>'], ['MENOR_IGUAL', '<='], ['MAYOR_IGUAL', '>=']],
    [['MAS', '+'], ['MENOS', '-']],
    [['POR', '*'], ['DIV', '/']],
  ];
  function expr(nivel = 0): Expr {
    if (nivel === NIVELES.length) return unario();
    let a = expr(nivel + 1);
    for (;;) {
      const op = NIVELES[nivel].find(([t]) => es(t));
      if (!op) return a;
      const t = next();
      const b = expr(nivel + 1);
      a = { k: 'bin', op: op[1], a, b, linea: t.linea, columna: t.columna };
    }
  }
  function unario(): Expr {
    const t = peek();
    if (es('NO')) { next(); return { k: 'no', e: unario(), linea: t.linea, columna: t.columna }; }
    if (es('MENOS')) { next(); return { k: 'neg', e: unario(), linea: t.linea, columna: t.columna }; }
    return primario();
  }
  function primario(): Expr {
    const t = next();
    const p = { linea: t.linea, columna: t.columna };
    if (t.type === 'NUMERO') return { k: 'num', valor: Number(t.value), ...p };
    if (t.type === 'TEXTO') return { k: 'texto', valor: t.value, ...p };
    if (t.type === 'PAREN_A') {
      const e = expr();
      esperar('PAREN_C', 'para cerrar el paréntesis');
      return e;
    }
    if (t.type === 'IDENT') {
      if (t.value === 'V' || t.value === 'F') return { k: 'bool', valor: t.value === 'V', ...p };
      if ((SENSORES as readonly string[]).includes(t.value)) return { k: 'sensor', nombre: t.value, ...p };
      const s = sugerir(t.value, SENSORES);
      if (s && s.toLowerCase() === t.value.toLowerCase()) {
        fallo(t, `"${t.value}" está mal escrito: el lenguaje distingue mayúsculas y minúsculas.`, `Escribí "${s}".`);
      }
      return { k: 'var', nombre: t.value, ...p };
    }
    return fallo(t, `Se esperaba un valor o una condición, pero hay ${describir(t)}.`);
  }
  function argumentos(contexto: string): Expr[] {
    esperar('PAREN_A', contexto);
    const args: Expr[] = [];
    if (!es('PAREN_C')) {
      args.push(expr());
      while (es('COMA')) { next(); args.push(expr()); }
    }
    esperar('PAREN_C', contexto);
    return args;
  }

  // ---------- Sentencias ----------
  function bloque(de: string): Sent[] {
    finDeLinea(`después de "${de}"`);
    if (!es('INDENT')) fallo(peek(), `El cuerpo de "${de}" tiene que estar en las líneas siguientes, con 2 espacios más de sangría.`);
    next();
    const sents: Sent[] = [];
    while (!es('DEDENT') && !es('EOF')) {
      try { sents.push(sentencia()); }
      catch (e) {
        if (!(e instanceof ParseError)) throw e;
        errores.push(e.e); sincronizar();
      }
    }
    if (es('DEDENT')) next();
    return sents;
  }

  function sentencia(): Sent {
    const t = peek();
    const p = { linea: t.linea, columna: t.columna };
    if (t.type !== 'IDENT') fallo(t, `Una instrucción no puede empezar con ${describir(t)}.`);
    const w = t.value;

    if (w === 'si') {
      next();
      const cond = expr();
      const entonces = bloque('si');
      if (esPalabra('sino')) {
        next();
        return { k: 'si', cond, entonces, sino: bloque('sino'), ...p };
      }
      return { k: 'si', cond, entonces, ...p };
    }
    if (w === 'sino') fallo(t, 'Hay un "sino" sin su "si": tiene que estar en la misma columna que el "si" al que pertenece.');
    if (w === 'mientras') { next(); const cond = expr(); return { k: 'mientras', cond, cuerpo: bloque('mientras'), ...p }; }
    if (w === 'repetir') { next(); const veces = expr(); return { k: 'repetir', veces, cuerpo: bloque('repetir'), ...p }; }
    if ((PRIMITIVAS as readonly string[]).includes(w)) { next(); finDeLinea(`después de "${w}"`); return { k: 'primitiva', nombre: w, ...p }; }
    if (w === 'Pos') {
      next();
      const args = argumentos('en Pos');
      if (args.length !== 2) fallo(t, 'Pos recibe exactamente dos valores: Pos(avenida, calle).');
      finDeLinea('después de Pos(...)');
      return { k: 'pos', av: args[0], ca: args[1], ...p };
    }
    if (w === 'Informar') {
      next();
      const args = argumentos('en Informar');
      if (args.length === 0) fallo(t, 'Informar necesita al menos un valor entre paréntesis.');
      finDeLinea('después de Informar(...)');
      return { k: 'informar', args, ...p };
    }
    if (es('ASIGNAR', undefined, 1)) {
      next(); next();
      const valor = expr();
      finDeLinea('al final de la asignación');
      return { k: 'asignar', nombre: w, valor, ...p };
    }
    if (es('DOSPUNTOS', undefined, 1) && es('IGUAL', undefined, 2)) {
      fallo(peek(1), 'La asignación se escribe ":=" sin espacios entre ":" y "=".');
    }
    if ((KEYWORDS as readonly string[]).includes(w)) {
      fallo(t, `"${w}" no puede ir acá. Revisá la sangría: puede que esta línea pertenezca a otro bloque.`);
    }
    next();
    const args = es('PAREN_A') ? argumentos(`en la llamada a ${w}`) : [];
    finDeLinea(`después de "${w}"`);
    return { k: 'llamada', nombre: w, args, ...p };
  }

  // ---------- Declaraciones ----------
  function tipo(): 'numero' | 'boolean' {
    const t = ident('de tipo');
    if (t.value === 'numero' || t.value === 'boolean') return t.value;
    const s = sugerir(t.value, ['numero', 'boolean']);
    return fallo(t, `"${t.value}" no es un tipo. Los tipos son numero y boolean.`, s ? `Escribí "${s}".` : undefined);
  }
  function declaraciones(): Decl[] {
    palabra('variables', '');
    finDeLinea('después de "variables"');
    if (!es('INDENT')) fallo(peek(), 'Las variables se declaran en las líneas siguientes, con 2 espacios más de sangría.');
    next();
    const decls: Decl[] = [];
    while (!es('DEDENT') && !es('EOF')) {
      try {
        const n = ident('de variable');
        esperar('DOSPUNTOS', 'entre el nombre de la variable y su tipo');
        decls.push({ nombre: n.value, tipo: tipo(), linea: n.linea, columna: n.columna });
        finDeLinea('después de la declaración');
      } catch (e) {
        if (!(e instanceof ParseError)) throw e;
        errores.push(e.e); sincronizar();
      }
    }
    if (es('DEDENT')) next();
    return decls;
  }
  function cuerpo(de: string): Sent[] {
    palabra('comenzar', `en ${de}`);
    const s = bloque('comenzar');
    palabra('fin', `para cerrar ${de}`);
    finDeLinea('después de "fin"');
    return s;
  }
  function proceso(): Proceso {
    const t = palabra('proceso', 'para declarar un proceso');
    const nombre = ident('de proceso');
    const params: Param[] = [];
    if (es('PAREN_A')) {
      next();
      do {
        if (params.length) next();
        const c = ident('(E o ES)');
        if (c.value !== 'E' && c.value !== 'ES') fallo(c, `Cada parámetro empieza con E (entrada) o ES (entrada/salida), no con "${c.value}".`);
        const n = ident('de parámetro');
        esperar('DOSPUNTOS', 'entre el nombre del parámetro y su tipo');
        params.push({ clase: c.value as 'E' | 'ES', nombre: n.value, tipo: tipo(), linea: n.linea, columna: n.columna });
      } while (es('PUNTOYCOMA'));
      if (es('COMA')) fallo(peek(), 'Los parámetros se separan con ";", no con ",".');
      esperar('PAREN_C', 'al final de los parámetros');
    }
    finDeLinea('después del encabezado del proceso');
    const variables = esPalabra('variables') ? declaraciones() : [];
    return { nombre: nombre.value, params, variables, cuerpo: cuerpo(`el proceso ${nombre.value}`), linea: t.linea, columna: t.columna };
  }

  function seccion<T>(w: string, item: () => T, inicio?: string): T[] {
    palabra(w, '');
    finDeLinea(`después de "${w}"`);
    if (!es('INDENT')) fallo(peek(), `El contenido de "${w}" va en las líneas siguientes, con 2 espacios más de sangría.`);
    next();
    const items: T[] = [];
    while (!es('DEDENT') && !es('EOF')) {
      try { items.push(item()); }
      catch (e) {
        if (!(e instanceof ParseError)) throw e;
        errores.push(e.e); sincronizar();
        // Evita errores en cascada: salta hasta el próximo elemento de la sección.
        while (inicio && !es('DEDENT') && !es('EOF') && !esPalabra(inicio)) sincronizar();
      }
    }
    if (es('DEDENT')) next();
    return items;
  }

  function area(): Area {
    const n = ident('de área');
    esperar('DOSPUNTOS', 'después del nombre del área');
    palabra('AreaC', 'para declarar el área');
    const nums: number[] = [];
    esperar('PAREN_A', 'en AreaC');
    for (let k = 0; k < 4; k++) {
      if (k) esperar('COMA', 'entre los valores de AreaC');
      nums.push(Number(esperar('NUMERO', 'en AreaC').value));
    }
    esperar('PAREN_C', 'en AreaC');
    finDeLinea('después de AreaC(...)');
    return { nombre: n.value, av1: nums[0], ca1: nums[1], av2: nums[2], ca2: nums[3], linea: n.linea, columna: n.columna };
  }
  function robot(): TipoRobot {
    const t = palabra('robot', 'para declarar el tipo de robot');
    const n = ident('de robot');
    finDeLinea('después del nombre del robot');
    const variables = esPalabra('variables') ? declaraciones() : [];
    return { nombre: n.value, variables, cuerpo: cuerpo(`el robot ${n.value}`), linea: t.linea, columna: t.columna };
  }
  function varRobot(): VarRobot {
    const n = ident('del robot');
    esperar('DOSPUNTOS', 'entre el nombre del robot y su tipo');
    const tp = ident('de tipo de robot');
    finDeLinea('después de la declaración');
    return { nombre: n.value, tipo: tp.value, linea: n.linea, columna: n.columna };
  }
  function principal(): Principal {
    const t = ident('');
    const p = { linea: t.linea, columna: t.columna };
    if (t.value === 'AsignarArea') {
      esperar('PAREN_A', 'en AsignarArea');
      const r = ident('del robot'); esperar('COMA', 'en AsignarArea'); const a = ident('del área');
      esperar('PAREN_C', 'en AsignarArea'); finDeLinea('después de AsignarArea(...)');
      return { k: 'asignarArea', robot: r.value, area: a.value, ...p };
    }
    if (t.value === 'Iniciar') {
      esperar('PAREN_A', 'en Iniciar');
      const r = ident('del robot'); esperar('COMA', 'en Iniciar');
      const av = expr(); esperar('COMA', 'en Iniciar'); const ca = expr();
      esperar('PAREN_C', 'en Iniciar'); finDeLinea('después de Iniciar(...)');
      return { k: 'iniciar', robot: r.value, av, ca, ...p };
    }
    const s = sugerir(t.value, ['AsignarArea', 'Iniciar']);
    return fallo(t, `En el programa principal solo van AsignarArea e Iniciar, no "${t.value}".`, s ? `¿Quisiste escribir "${s}"?` : undefined);
  }

  // ---------- Programa ----------
  try {
    while (es('NEWLINE')) next();
    if (es('INDENT')) fallo(peek(), 'La palabra "programa" tiene que empezar en la primera columna.');
    palabra('programa', 'al comienzo');
    const nombre = ident('del programa').value;
    finDeLinea('después del nombre del programa');
    const procesos = esPalabra('procesos') ? seccion('procesos', proceso, 'proceso') : [];
    const areas = seccion('areas', area);
    const robots = seccion('robots', robot, 'robot');
    const variables = seccion('variables', varRobot);
    palabra('comenzar', 'en el programa principal');
    finDeLinea('después de "comenzar"');
    if (!es('INDENT')) fallo(peek(), 'Las instrucciones del programa principal van con 2 espacios de sangría.');
    next();
    const princ: Principal[] = [];
    while (!es('DEDENT') && !es('EOF')) {
      try { princ.push(principal()); }
      catch (e) { if (!(e instanceof ParseError)) throw e; errores.push(e.e); sincronizar(); }
    }
    if (es('DEDENT')) next();
    palabra('fin', 'para cerrar el programa');
    if (es('NEWLINE')) next();
    if (!es('EOF')) fallo(peek(), `Después del "fin" del programa no puede haber nada más, y hay ${describir(peek())}.`);
    return { programa: { nombre, procesos, areas, robots, variables, principal: princ }, errores };
  } catch (e) {
    if (!(e instanceof ParseError)) throw e;
    errores.push(e.e);
    return { errores };
  }
}
