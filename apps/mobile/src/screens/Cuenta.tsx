import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSesion } from '../auth/sesion';
import { Pantalla } from '../components/Pantalla';
import { Encabezado, Tarjeta } from '../components/ui';
import { useProgreso } from '../progreso';
import { color, espacio, radio } from '../theme';

const PROVEEDOR: Record<string, string> = { google: 'Google', apple: 'Apple', email: 'Email' };

/** Pregunta antes de una acción; en la web Alert no tiene botones, se usa confirm. */
function confirmar(titulo: string, mensaje: string, accion: string, destructiva: boolean): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${titulo}\n\n${mensaje}`));
  return new Promise((ok) => Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel', onPress: () => ok(false) },
    { text: accion, style: destructiva ? 'destructive' : 'default', onPress: () => ok(true) },
  ], { cancelable: true, onDismiss: () => ok(false) }));
}

export function Cuenta() {
  const { sesion, salir, eliminarCuenta } = useSesion();
  const { recargar } = useProgreso();
  const [ocupado, setOcupado] = useState<'salir' | 'eliminar' | null>(null);
  const [error, setError] = useState('');

  const usuario = sesion?.user;
  const nombre = (usuario?.user_metadata?.full_name as string | undefined) ?? '';
  const proveedor = PROVEEDOR[(usuario?.app_metadata?.provider as string | undefined) ?? ''] ?? '';

  async function cerrarSesion() {
    if (!(await confirmar('Cerrar sesión', 'Tu progreso queda guardado en este teléfono.', 'Cerrar sesión', false))) return;
    setOcupado('salir'); setError('');
    try { await salir(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); setOcupado(null); }
  }

  async function eliminar() {
    const ok = await confirmar(
      '¿Eliminar tu cuenta?',
      'Se borra tu cuenta y todo tu progreso de forma permanente. No se puede deshacer.',
      'Eliminar cuenta',
      true,
    );
    if (!ok) return;
    setOcupado('eliminar'); setError('');
    try {
      await eliminarCuenta();
      await recargar();
    } catch (e) {
      setError(`No se pudo eliminar la cuenta: ${e instanceof Error ? e.message : String(e)}. Probá de nuevo con conexión a internet.`);
      setOcupado(null);
    }
  }

  return (
    <Pantalla>
      <Encabezado titulo="Tu cuenta" onVolver={() => router.back()} />
      <ScrollView contentContainerStyle={st.contenido}>
        <Tarjeta estilo={st.perfil}>
          <View style={st.avatar}><Ionicons name="person" size={26} color={color.acentoTexto} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            {nombre ? <Text style={st.nombre} numberOfLines={1}>{nombre}</Text> : null}
            <Text style={nombre ? st.email : st.nombre} numberOfLines={1}>{usuario?.email ?? 'Sin email'}</Text>
            {proveedor ? <Text style={st.email}>Entraste con {proveedor}</Text> : null}
          </View>
        </Tarjeta>

        <Tarjeta estilo={{ padding: 0 }}>
          <Fila icono="log-out-outline" texto="Cerrar sesión" onPress={cerrarSesion} cargando={ocupado === 'salir'} deshabilitado={!!ocupado} />
        </Tarjeta>

        <Text style={st.seccion}>Zona de peligro</Text>
        <Tarjeta estilo={{ padding: 0 }}>
          <Fila icono="trash-outline" texto="Eliminar cuenta" peligro onPress={eliminar} cargando={ocupado === 'eliminar'} deshabilitado={!!ocupado} />
        </Tarjeta>
        <Text style={st.nota}>Borra tu cuenta y tu progreso de forma inmediata y permanente.</Text>
        {error ? <Text style={st.error}>{error}</Text> : null}
      </ScrollView>
    </Pantalla>
  );
}

function Fila({ icono, texto, onPress, peligro, cargando, deshabilitado }: {
  icono: 'log-out-outline' | 'trash-outline'; texto: string; onPress: () => void; peligro?: boolean; cargando?: boolean; deshabilitado?: boolean;
}) {
  const tinta = peligro ? color.mal : color.texto;
  return (
    <Pressable onPress={onPress} disabled={deshabilitado} accessibilityRole="button" style={({ pressed }) => [st.fila, (pressed || deshabilitado) && { opacity: 0.6 }]}>
      <Ionicons name={icono} size={20} color={tinta} />
      <Text style={[st.filaTexto, { color: tinta }]}>{texto}</Text>
      {cargando ? <ActivityIndicator color={tinta} /> : <Ionicons name="chevron-forward" size={18} color={color.suave} />}
    </Pressable>
  );
}

const st = StyleSheet.create({
  contenido: { padding: espacio(4), gap: espacio(3) },
  perfil: { flexDirection: 'row', alignItems: 'center', gap: espacio(3) },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: color.acentoSuave, alignItems: 'center', justifyContent: 'center' },
  nombre: { fontSize: 17, fontWeight: '700', color: color.texto },
  email: { fontSize: 13, color: color.suave },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio(3), paddingHorizontal: espacio(4), minHeight: 56 },
  filaTexto: { flex: 1, fontSize: 16, fontWeight: '600' },
  seccion: { fontSize: 13, fontWeight: '700', color: color.suave, marginTop: espacio(3), textTransform: 'uppercase', letterSpacing: 0.5 },
  nota: { fontSize: 13, lineHeight: 18, color: color.suave },
  error: { fontSize: 13, lineHeight: 18, color: color.mal, backgroundColor: color.malFondo, padding: espacio(3), borderRadius: radio.sm },
});
