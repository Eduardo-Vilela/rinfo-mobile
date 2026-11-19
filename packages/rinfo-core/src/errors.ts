export type Fase = 'lexico' | 'sintactico' | 'semantico' | 'ejecucion';

export type RInfoError = {
  fase: Fase;
  linea: number; // 1-based
  columna: number; // 1-based
  mensaje: string;
  sugerencia?: string;
};

export class RInfoException extends Error {
  constructor(public readonly error: RInfoError) {
    super(error.mensaje);
  }
}

export function err(fase: Fase, linea: number, columna: number, mensaje: string, sugerencia?: string): RInfoError {
  return sugerencia ? { fase, linea, columna, mensaje, sugerencia } : { fase, linea, columna, mensaje };
}
