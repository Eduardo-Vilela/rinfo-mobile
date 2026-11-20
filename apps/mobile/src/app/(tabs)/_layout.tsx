import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Icono } from '../../components/ui';
import { color } from '../../theme';

function icono(normal: Icono, activo: Icono) {
  return function TabIcon({ focused, color: tinta }: { focused: boolean; color: ColorValue }) {
    return (
      <View style={[st.pildora, focused && { backgroundColor: color.acentoSuave }]}>
        <Ionicons name={focused ? activo : normal} size={22} color={String(tinta)} />
      </View>
    );
  };
}

export default function TabsLayout() {
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.acentoTexto,
        tabBarInactiveTintColor: color.suave,
        tabBarStyle: { backgroundColor: color.tarjeta, borderTopColor: color.borde, height: 64 + bottom, paddingTop: 6, paddingBottom: bottom + 6 },
        tabBarItemStyle: { gap: 2 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: color.fondo },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Aprender', tabBarIcon: icono('school-outline', 'school') }} />
      <Tabs.Screen name="practicar" options={{ title: 'Practicar', tabBarIcon: icono('code-slash-outline', 'code-slash') }} />
      <Tabs.Screen name="examen" options={{ title: 'Examen', tabBarIcon: icono('timer-outline', 'timer') }} />
    </Tabs>
  );
}

const st = StyleSheet.create({
  pildora: { paddingHorizontal: 18, paddingVertical: 3, borderRadius: 999 },
});
