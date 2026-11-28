import type { ComponentType } from 'react';

export async function appleDisponible() { return false; }
export async function entrarConApple() { return false; }
export const BotonApple: ComponentType<Record<string, unknown>> = () => null;
export const tipoBoton = 1;
export const estiloBoton = 2;
