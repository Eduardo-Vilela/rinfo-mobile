import { describe, expect, it } from 'vitest';
import { compilar, corregir, EJERCICIOS, ejecutar, respuestasQueHace } from '../src';
import type { EjercicioPrograma, EjercicioQueHace } from '../src';

const programa = (cuerpo: string, vars = '') => `programa Prueba
areas
  ciudad: AreaC(1,1,100,100)
robots
  robot robot1
${vars}  comenzar
${cuerpo.trim().split('\n').map((l) => '    ' + l).join('\n')}
  fin
variables
  R-info: robot1
comenzar
  AsignarArea(R-info,ciudad)
  Iniciar(R-info,1,1)
fin`;

const primerError = (codigo: string) => compilar(codigo).errores[0];

describe('soluciones de referencia', () => {
  for (const e of EJERCICIOS) {
    it(`${e.id} compila`, () => {
      const codigo = (e.tipo === 'programa' ? e.solucion : e.programa).join('\n');
      expect(compilar(codigo).errores).toEqual([]);
    });
  }
  for (const e of EJERCICIOS.filter((x): x is EjercicioPrograma => x.tipo === 'programa')) {
    it(`${e.id} se aprueba a sí misma sin errores de ejecución`, () => {
      const c = corregir(e.solucion.join('\n'), e);
      expect(c.estado).toBe('corregido');
      if (c.estado === 'corregido') {
        expect(c.escenarios.flatMap((s) => s.diferencias)).toEqual([]);
        expect(c.aprobado).toBe(true);
      }
    });
  }
});

describe('errores típicos de examen', () => {
  it('mayúsculas en una primitiva', () => {
    const e = primerError(programa('tomarflor'));
    expect(e.mensaje).toMatch(/no es una instrucción/);
    expect(e.sugerencia).toMatch(/tomarFlor/);
  });
  it('sensor mal escrito', () => {
    const e = primerError(programa('si hayFlorEnLaEsquina\n  tomarFlor'));
    expect(e.sugerencia).toMatch(/HayFlorEnLaEsquina/);
  });
  it('Fin con mayúscula', () => {
    const e = primerError(programa('mover').replace(/fin$/, 'Fin'));
    expect(e.mensaje).toMatch(/mayúsculas/);
    expect(e.sugerencia).toMatch(/"fin"/);
  });
  it('sangría de 3 espacios', () => {
    const e = primerError(programa('mientras HayFlorEnLaEsquina\n   tomarFlor'));
    expect(e.mensaje).toMatch(/Sangría incorrecta/);
    expect(e.linea).toBe(8);
  });
  it('tabulador', () => {
    expect(primerError(programa('mientras HayFlorEnLaEsquina\n\ttomarFlor')).mensaje).toMatch(/tabulador/);
  });
  it('variable sin declarar', () => {
    expect(primerError(programa('cant := 0')).mensaje).toMatch(/no está declarada/);
  });
  it('asignar a un parámetro E', () => {
    const codigo = `programa P
procesos
  proceso Q(E n: numero)
  comenzar
    n := n - 1
  fin
areas
  ciudad: AreaC(1,1,100,100)
robots
  robot robot1
  comenzar
    Q(3)
  fin
variables
  R-info: robot1
comenzar
  AsignarArea(R-info,ciudad)
  Iniciar(R-info,1,1)
fin`;
    expect(primerError(codigo).mensaje).toMatch(/parámetro de entrada \(E\)/);
  });
  it('Iniciar con el tipo de robot en lugar de R-info', () => {
    expect(compilar(programa('mover').replace('Iniciar(R-info', 'Iniciar(robot1')).errores.map((e) => e.mensaje).join(' ')).toMatch(/no es un robot declarado/);
  });
  it('reporta varios errores a la vez', () => {
    expect(compilar(programa('tomarflor\nmovr\nderecha')).errores.length).toBe(2);
  });
});

describe('ejecución', () => {
  it('ES devuelve el valor al robot', () => {
    const codigo = `programa P
procesos
  proceso Contar(ES c: numero)
  comenzar
    mientras HayFlorEnLaEsquina
      tomarFlor
      c := c + 1
  fin
areas
  ciudad: AreaC(1,1,100,100)
robots
  robot robot1
  variables
    total: numero
  comenzar
    total := 0
    Contar(total)
    Informar(total)
  fin
variables
  R-info: robot1
comenzar
  AsignarArea(R-info,ciudad)
  Iniciar(R-info,1,1)
fin`;
    const c = compilar(codigo);
    expect(c.errores).toEqual([]);
    expect(ejecutar(c.programa!, { flores: [[1, 1, 4]] }).informes).toEqual(['4']);
  });
  it('tomarFlor sin flores es error de ejecución', () => {
    const r = ejecutar(compilar(programa('tomarFlor')).programa!, {});
    expect(r.error?.mensaje).toMatch(/no hay flores/);
  });
  it('salirse de la ciudad', () => {
    const r = ejecutar(compilar(programa('repetir 3\n  derecha\nmover')).programa!, {});
    expect(r.error?.mensaje).toMatch(/saca al robot/);
  });
  it('variable sin inicializar', () => {
    const r = ejecutar(compilar(programa('Informar(n)', '  variables\n    n: numero\n')).programa!, {});
    expect(r.error?.mensaje).toMatch(/sin haberle dado un valor/);
  });
  it('división entera', () => {
    expect(ejecutar(compilar(programa('Informar(25 / 3)')).programa!, {}).informes).toEqual(['8']);
  });
  it('bucle infinito se corta', () => {
    const r = ejecutar(compilar(programa('mientras V\n  derecha')).programa!, {});
    expect(r.error?.mensaje).toMatch(/no termina/);
  });
});

describe('¿Qué hace?', () => {
  it('queHace1 se detiene en (6,2) con una flor por esquina', () => {
    const e = EJERCICIOS.find((x) => x.id === 'c3-01a') as EjercicioQueHace;
    const r = respuestasQueHace(e.programa, e.escenarios).respuestas;
    expect(r[0].resultado.posicionFinal).toEqual([6, 2]);
    expect(r[1].resultado.posicionFinal).toEqual([6, 100]);
    expect(r[2].resultado.posicionFinal).toEqual([6, 1]);
  });
  it('queHace2 informa 0 o 10', () => {
    const e = EJERCICIOS.find((x) => x.id === 'c3-01b') as EjercicioQueHace;
    const r = respuestasQueHace(e.programa, e.escenarios).respuestas;
    expect(r.map((x) => x.resultado.informes[0])).toEqual(['0', '10', '10', '10']);
  });
});
