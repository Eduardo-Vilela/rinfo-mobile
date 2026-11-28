import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
// En iOS hace falta además el cliente OAuth de iOS y su URL scheme en app.json: por ahora solo Android.
export const googleConfigurado = webClientId !== '' && Platform.OS === 'android';

let configurado = false;

/**
 * Inicio de sesión nativo de Google: Google devuelve un ID token y Supabase lo valida y crea la sesión.
 * Devuelve false si la persona cerró el selector de cuentas.
 */
export async function entrarConGoogle(): Promise<boolean> {
  if (!configurado) {
    GoogleSignin.configure({ webClientId });
    configurado = true;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const respuesta = await GoogleSignin.signIn();
    if (!isSuccessResponse(respuesta)) return false;
    const token = respuesta.data.idToken;
    if (!token) throw new Error('Google no devolvió el token de identidad.');
    const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token });
    if (error) throw error;
    return true;
  } catch (e) {
    if (isErrorWithCode(e) && (e.code === statusCodes.SIGN_IN_CANCELLED || e.code === statusCodes.IN_PROGRESS)) return false;
    if (isErrorWithCode(e) && e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) throw new Error('Este teléfono no tiene Google Play Services. Entrá con tu email.');
    throw e;
  }
}

export async function salirDeGoogle() {
  if (configurado) await GoogleSignin.signOut().catch(() => {});
}
