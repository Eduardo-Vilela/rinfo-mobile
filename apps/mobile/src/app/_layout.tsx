import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProgresoProvider, useProgreso } from '../progreso';
import { color } from '../theme';

// La pantalla de inicio queda visible hasta que el progreso guardado esté leído.
SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 300, fade: true });

function Navegacion() {
  const { listo } = useProgreso();
  useEffect(() => { if (listo) SplashScreen.hide(); }, [listo]);
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.fondo } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="leccion/[id]" />
      <Stack.Screen name="actividad/[id]" />
      <Stack.Screen name="ejercicio/[id]" />
      <Stack.Screen name="resultado" options={{ animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ProgresoProvider>
        <Navegacion />
      </ProgresoProvider>
    </SafeAreaProvider>
  );
}
