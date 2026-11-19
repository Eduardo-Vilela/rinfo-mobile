import type { ArchivoEjercicios, Ejercicio } from './types';
import cap2 from '../ejercicios/cap2.json';
import cap3 from '../ejercicios/cap3.json';

/** Para sumar ejercicios: creá un JSON nuevo en /ejercicios y agregalo a esta lista. */
export const CAPITULOS = [cap2, cap3] as unknown as ArchivoEjercicios[];
export const EJERCICIOS: Ejercicio[] = CAPITULOS.flatMap((c) => c.ejercicios);
