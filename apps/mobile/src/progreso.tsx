import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { leerLecciones, leerResueltos } from './storage';

type Progreso = { listo: boolean; resueltos: Set<string>; lecciones: Set<string>; recargar: () => Promise<void> };

const Contexto = createContext<Progreso>({ listo: false, resueltos: new Set(), lecciones: new Set(), recargar: async () => {} });

/** Progreso guardado en el teléfono, leído una vez al abrir la app y releído cuando hace falta. */
export function ProgresoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState({ listo: false, resueltos: new Set<string>(), lecciones: new Set<string>() });
  const recargar = useCallback(async () => {
    const [resueltos, lecciones] = await Promise.all([leerResueltos(), leerLecciones()]);
    setEstado({ listo: true, resueltos, lecciones });
  }, []);
  useEffect(() => {
    let vivo = true;
    Promise.all([leerResueltos(), leerLecciones()]).then(([resueltos, lecciones]) => {
      if (vivo) setEstado({ listo: true, resueltos, lecciones });
    });
    return () => { vivo = false; };
  }, []);
  return <Contexto.Provider value={{ ...estado, recargar }}>{children}</Contexto.Provider>;
}

export const useProgreso = () => useContext(Contexto);
