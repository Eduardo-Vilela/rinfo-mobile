import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { color, espacio, mono } from '../theme';

export function Boton({ titulo, onPress, tipo = 'primario', deshabilitado }: {
  titulo: string; onPress: () => void; tipo?: 'primario' | 'secundario'; deshabilitado?: boolean;
}) {
  const primario = tipo === 'primario';
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      style={({ pressed }) => [
        s.boton,
        primario ? { backgroundColor: color.texto } : { backgroundColor: color.superficie },
        (pressed || deshabilitado) && { opacity: 0.5 },
      ]}
    >
      <Text style={[s.botonTexto, { color: primario ? color.fondo : color.texto }]}>{titulo}</Text>
    </Pressable>
  );
}

export function Encabezado({ titulo, onVolver, derecha }: { titulo: string; onVolver?: () => void; derecha?: ReactNode }) {
  return (
    <View style={s.encabezado}>
      {onVolver ? (
        <Pressable onPress={onVolver} hitSlop={12} style={s.volver}>
          <Text style={s.volverTexto}>‹</Text>
        </Pressable>
      ) : null}
      <Text style={s.titulo} numberOfLines={1}>{titulo}</Text>
      <View style={{ marginLeft: 'auto' }}>{derecha}</View>
    </View>
  );
}

export function Tarjeta({ children, estilo }: { children: ReactNode; estilo?: ViewStyle }) {
  return <View style={[s.tarjeta, estilo]}>{children}</View>;
}

/** Código con números de línea, solo lectura. */
export function CodigoNumerado({ lineas, marcadas = [] }: { lineas: string[]; marcadas?: number[] }) {
  return (
    <View style={s.codigo}>
      {lineas.map((l, i) => (
        <View key={i} style={[s.codigoLinea, marcadas.includes(i + 1) && { backgroundColor: color.malFondo }]}>
          <Text style={s.nro}>{i + 1}</Text>
          <Text style={s.codigoTexto}>{l || ' '}</Text>
        </View>
      ))}
    </View>
  );
}

export const s = StyleSheet.create({
  boton: { paddingVertical: espacio(3), paddingHorizontal: espacio(4), borderRadius: 10, alignItems: 'center', flex: 1 },
  botonTexto: { fontSize: 15, fontWeight: '600' },
  encabezado: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: espacio(4), paddingVertical: espacio(3), gap: espacio(2) },
  volver: { paddingRight: espacio(2) },
  volverTexto: { fontSize: 30, lineHeight: 30, color: color.texto },
  titulo: { fontSize: 20, fontWeight: '700', color: color.texto, flexShrink: 1 },
  tarjeta: { backgroundColor: color.superficie, borderRadius: 12, padding: espacio(4) },
  codigo: { backgroundColor: color.superficie, borderRadius: 12, paddingVertical: espacio(3) },
  codigoLinea: { flexDirection: 'row', paddingHorizontal: espacio(3) },
  nro: { width: 28, fontFamily: mono, fontSize: 13, lineHeight: 20, color: color.suave },
  codigoTexto: { fontFamily: mono, fontSize: 13, lineHeight: 20, color: color.texto },
  texto: { fontSize: 15, lineHeight: 22, color: color.texto },
  suave: { fontSize: 13, color: color.suave },
});
