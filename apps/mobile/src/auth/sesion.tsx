import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { borrarProgreso } from '../storage';
import { salirDeGoogle } from './google';
import { authConfigurado, supabase } from './supabase';

type Sesion = { cargando: boolean; sesion: Session | null; salir: () => Promise<void>; eliminarCuenta: () => Promise<void> };

const salir = async () => {
  await salirDeGoogle();
  await supabase.auth.signOut();
};

/**
 * Borra la cuenta en Supabase (función `eliminar_cuenta`, ver supabase/migrations), el progreso del teléfono
 * y cierra la sesión. Lo exigen App Store (5.1.1(v)) y Google Play.
 */
const eliminarCuenta = async () => {
  const { error } = await supabase.rpc('eliminar_cuenta');
  if (error) throw error;
  await borrarProgreso();
  await salirDeGoogle();
  await supabase.auth.signOut({ scope: 'local' });
};

const Contexto = createContext<Sesion>({ cargando: true, sesion: null, salir, eliminarCuenta });

/** Registra que la persona abrió la app (para ver cuántos la usan). Si falla, no molesta. */
async function marcarAcceso() {
  await supabase.rpc('registrar_acceso');
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<{ cargando: boolean; sesion: Session | null }>({ cargando: authConfigurado, sesion: null });

  useEffect(() => {
    if (!authConfigurado) return;
    let vivo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (vivo) setEstado({ cargando: false, sesion: data.session });
      if (data.session) marcarAcceso().catch(() => {});
    });
    const { data } = supabase.auth.onAuthStateChange((evento, sesion) => {
      setEstado({ cargando: false, sesion });
      if (evento === 'SIGNED_IN') marcarAcceso().catch(() => {});
    });
    return () => { vivo = false; data.subscription.unsubscribe(); };
  }, []);

  return <Contexto.Provider value={{ ...estado, salir, eliminarCuenta }}>{children}</Contexto.Provider>;
}

export const useSesion = () => useContext(Contexto);
