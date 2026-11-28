import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Icono } from '../../components/ui';
import { color } from '../../theme';

/**
 * Ícono de pestaña: relleno y en color acento cuando está activa.
 * Usa el tamaño que da la barra: en Android el contenedor del ícono es fijo (31×28) y recorta lo que se sale.
 */
function icono(normal: Icono, activo: Icono) {
  return function TabIcon({ focused, color: tinta, size }: { focused: boolean; color: ColorValue; size: number }) {
    return <Ionicons name={focused ? activo : normal} size={size} color={String(tinta)} />;
  };
}

export default function TabsLayout() {
  // Mismo inset que usa la librería: deja libre la barra de navegación de Android (gestos o 3 botones).
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.acentoTexto,
        tabBarInactiveTintColor: color.suave,
        // Ítem = 5 de relleno + ícono 28 + etiqueta 15 + 5: el alto por defecto (49) deja 11px y recorta las etiquetas.
        tabBarStyle: { backgroundColor: color.tarjeta, borderTopColor: color.borde, height: 66 + bottom, paddingTop: 4, paddingBottom: bottom + 4 },
        tabBarLabelStyle: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
        sceneStyle: { backgroundColor: color.fondo },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Aprender', tabBarIcon: icono('school-outline', 'school') }} />
      <Tabs.Screen name="practicar" options={{ title: 'Practicar', tabBarIcon: icono('code-slash-outline', 'code-slash') }} />
      <Tabs.Screen name="examen" options={{ title: 'Examen', tabBarIcon: icono('timer-outline', 'timer') }} />
    </Tabs>
  );
}
