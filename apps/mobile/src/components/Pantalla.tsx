import type { ReactNode } from 'react';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { color } from '../theme';

/** Contenedor de cada pantalla: respeta la barra de estado y, fuera de las pestañas, el borde inferior. */
export function Pantalla({ children, bordes = ['top', 'bottom'] }: { children: ReactNode; bordes?: Edge[] }) {
  return <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }} edges={bordes}>{children}</SafeAreaView>;
}
