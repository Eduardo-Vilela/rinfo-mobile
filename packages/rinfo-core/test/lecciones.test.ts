import { describe, expect, it } from 'vitest';
import { compilar, EJERCICIOS, ejecutar, LECCIONES } from '../src';

describe('lecciones', () => {
  it('van de la 0 a la 7 en orden', () => {
    expect(LECCIONES.map((l) => l.capitulo)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
  for (const l of LECCIONES) {
    it(`${l.id}: actividades existentes`, () => {
      for (const id of l.actividades) expect(EJERCICIOS.some((e) => e.id === id)).toBe(true);
    });
    l.secciones.forEach((s, i) => {
      if (s.tipo === 'ejemplo') {
        it(`${l.id} ejemplo ${i}: compila, corre y los pasos apuntan a líneas reales`, () => {
          const c = compilar(s.programa.join('\n'));
          expect(c.errores).toEqual([]);
          expect(ejecutar(c.programa!, s.escenario).error).toBeUndefined();
          for (const p of s.pasos) {
            expect(p.lineas[0]).toBeGreaterThan(0);
            expect(p.lineas[1]).toBeLessThanOrEqual(s.programa.length);
          }
        });
      }
      if (s.tipo === 'pregunta') {
        it(`${l.id} pregunta ${i}: respuesta válida`, () => {
          expect(s.correcta).toBeLessThan(s.opciones.length);
          if (s.programa?.[0].startsWith('programa')) {
            const c = compilar(s.programa.join('\n'));
            expect(c.errores).toEqual([]);
          }
        });
      }
    });
  }
  it('l3: la pregunta del mapa informa 3', () => {
    const q = LECCIONES[3].secciones.find((s) => s.tipo === 'pregunta' && s.escenario)!;
    if (q.tipo !== 'pregunta') throw 0;
    expect(ejecutar(compilar(q.programa!.join('\n')).programa!, q.escenario!).informes).toEqual(['3']);
  });
  it('l4: la pregunta del mapa termina en (1,4)', () => {
    const q = LECCIONES[4].secciones.find((s) => s.tipo === 'pregunta' && s.escenario)!;
    if (q.tipo !== 'pregunta') throw 0;
    expect(ejecutar(compilar(q.programa!.join('\n')).programa!, q.escenario!).posicionFinal).toEqual([1, 4]);
  });
  it('l7: SumarUno informa 6', () => {
    const q = LECCIONES[7].secciones.filter((s) => s.tipo === 'pregunta').at(-1)!;
    if (q.tipo !== 'pregunta') throw 0;
    expect(ejecutar(compilar(q.programa!.join('\n')).programa!, {}).informes).toEqual(['6']);
  });
});
