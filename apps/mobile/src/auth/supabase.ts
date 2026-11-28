import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const clave = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

/** Sin URL y clave (por ejemplo en un build local sin .env) la app funciona sin cuentas. */
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
