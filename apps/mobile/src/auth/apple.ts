import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/** "Iniciar sesión con Apple" solo existe en iOS (App Store lo exige si se ofrece Google). */
export async function appleDisponible(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}

/** Devuelve false si la persona canceló. */
export async function entrarConApple(): Promise<boolean> {
  try {
    const credencial = await AppleAuthentication.signInAsync({
      requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    });
    if (!credencial.identityToken) throw new Error('Apple no devolvió el token de identidad.');
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credencial.identityToken });
    if (error) throw error;
    // Apple manda el nombre solo la primera vez: se guarda en el perfil.
    const nombre = [credencial.fullName?.givenName, credencial.fullName?.familyName].filter(Boolean).join(' ');
    if (nombre) await supabase.auth.updateUser({ data: { full_name: nombre } });
    return true;
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    throw e;
  }
}

export const BotonApple = AppleAuthentication.AppleAuthenticationButton;
export const tipoBoton = AppleAuthentication.AppleAuthenticationButtonType.CONTINUE;
export const estiloBoton = AppleAuthentication.AppleAuthenticationButtonStyle.BLACK;
