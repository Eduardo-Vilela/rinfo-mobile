import type { Correccion } from 'rinfo-core';

/** Última entrega, para pasarla de la pantalla del ejercicio a la de resultado (no entra en la URL). */
export type Entrega = { cola: string[]; k: number; examen: boolean; codigo: string; correccion: Correccion };

let ultima: Entrega | undefined;
export const guardarEntrega = (e: Entrega) => { ultima = e; };
export const leerEntrega = () => ultima;
