import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

/**
 * Proyecto de producción. La publishable key es pública por diseño (viaja dentro de la app):
 * los datos los protegen las políticas RLS y los permisos de supabase/migrations.
 * Se pueden pisar con EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY (por ejemplo, un proyecto de pruebas).
 * Con EXPO_PUBLIC_SIN_LOGIN=1 la app funciona sin cuentas.
 */
const PRODUCCION = {
  url: 'https://vbpzqqwqhcsyidsbvgvi.supabase.co',
  clave: 'sb_publishable_AXYnGuCTT1tGlpwbFQd-jQ_XNzNbJbl',
};
const sinLogin = process.env.EXPO_PUBLIC_SIN_LOGIN === '1';
const url = sinLogin ? '' : process.env.EXPO_PUBLIC_SUPABASE_URL || PRODUCCION.url;
const clave = sinLogin ? '' : process.env.EXPO_PUBLIC_SUPABASE_KEY || PRODUCCION.clave;

export const authConfigurado = url !== '' && clave !== '';

export const supabase = createClient(url || 'https://sin-configurar.supabase.co', clave || 'sin-clave', {
  auth: {
    storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Renueva el token solo con la app en primer plano (recomendado por Supabase para React Native).
if (authConfigurado && Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
