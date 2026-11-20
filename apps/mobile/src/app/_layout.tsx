import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { color } from '../theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.fondo } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="leccion/[id]" />
        <Stack.Screen name="actividad/[id]" />
        <Stack.Screen name="ejercicio/[id]" />
        <Stack.Screen name="resultado" options={{ animation: 'fade' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
