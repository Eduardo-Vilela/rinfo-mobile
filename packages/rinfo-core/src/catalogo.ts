import type { ArchivoEjercicios, Ejercicio } from './types';
import cap2 from '../ejercicios/cap2.json';
import cap3 from '../ejercicios/cap3.json';
import cap4 from '../ejercicios/cap4.json';
import cap5 from '../ejercicios/cap5.json';
import cap6 from '../ejercicios/cap6.json';
import cap7 from '../ejercicios/cap7.json';
import adicionales from '../ejercicios/adicionales.json';

/** Para sumar ejercicios: creá un JSON nuevo en /ejercicios y agregalo a esta lista. */
export const CAPITULOS = [cap2, cap3, cap4, cap5, cap6, cap7, adicionales] as unknown as ArchivoEjercicios[];
export const EJERCICIOS: Ejercicio[] = CAPITULOS.flatMap((c) => c.ejercicios);

import lecciones from '../ejercicios/lecciones.json';
import type { Leccion } from './types';
export const LECCIONES = (lecciones as unknown as { lecciones: Leccion[] }).lecciones;
