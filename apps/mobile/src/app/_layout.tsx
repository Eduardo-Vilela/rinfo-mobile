import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SesionProvider, useSesion } from '../auth/sesion';
import { authConfigurado } from '../auth/supabase';
import { ProgresoProvider, useProgreso } from '../progreso';
import { color } from '../theme';

// La pantalla de inicio queda visible hasta tener la fuente de íconos, el progreso y la sesión.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

function Navegacion() {
  const { listo } = useProgreso();
  const { cargando, sesion } = useSesion();
  // Login obligatorio. Si el build no tiene Supabase configurado, la app se usa sin cuenta.
  const adentro = !authConfigurado || !!sesion;
  const [fuentes, errorFuentes] = useFonts(Ionicons.font);
  const preparado = listo && !cargando && (fuentes || !!errorFuentes);
  useEffect(() => { if (preparado) SplashScreen.hide(); }, [preparado]);
  if (!preparado) return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.fondo } }}>
      <Stack.Protected guard={adentro}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="leccion/[id]" />
        <Stack.Screen name="actividad/[id]" />
        <Stack.Screen name="ejercicio/[id]" />
        <Stack.Screen name="resultado" options={{ animation: 'fade' }} />
        <Stack.Screen name="cuenta" />
      </Stack.Protected>
      <Stack.Protected guard={!adentro}>
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SesionProvider>
        <ProgresoProvider>
          <Navegacion />
        </ProgresoProvider>
      </SesionProvider>
    </SafeAreaProvider>
  );
}
