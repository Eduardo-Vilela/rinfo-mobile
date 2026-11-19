export type Contenido = { flores: number; papeles: number };
export type Bolsa = Contenido;

/** Ciudad de 100 avenidas × 100 calles. Solo guarda las esquinas con algo. */
export class Ciudad {
  private esquinas = new Map<number, Contenido>();
  static clave = (av: number, ca: number) => av * 1000 + ca;

  get(av: number, ca: number): Contenido {
    return this.esquinas.get(Ciudad.clave(av, ca)) ?? { flores: 0, papeles: 0 };
  }
  set(av: number, ca: number, c: Contenido) {
    const k = Ciudad.clave(av, ca);
    if (c.flores === 0 && c.papeles === 0) this.esquinas.delete(k);
    else this.esquinas.set(k, { ...c });
  }
  sumar(av: number, ca: number, objeto: 'flores' | 'papeles', n: number) {
    const c = this.get(av, ca);
    this.set(av, ca, { ...c, [objeto]: c[objeto] + n });
  }
  clonar(): Ciudad {
    const c = new Ciudad();
    for (const [k, v] of this.esquinas) c.esquinas.set(k, { ...v });
    return c;
  }
  /** Lista ordenada [av, ca, flores, papeles] de esquinas no vacías, para comparar estados. */
  snapshot(): [number, number, number, number][] {
    return [...this.esquinas.entries()]
      .sort(([a], [b]) => a - b)
      .map(([k, v]) => [Math.floor(k / 1000), k % 1000, v.flores, v.papeles]);
  }
}
