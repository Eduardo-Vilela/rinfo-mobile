import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { color, espacio, mono, radio, sombra } from '../theme';

export const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export type Icono = ComponentProps<typeof Ionicons>['name'];

export function Boton({ titulo, onPress, tipo = 'primario', deshabilitado, icono, estilo }: {
  titulo: string; onPress: () => void; tipo?: 'primario' | 'secundario' | 'fantasma'; deshabilitado?: boolean; icono?: Icono; estilo?: StyleProp<ViewStyle>;
}) {
  const fondo = tipo === 'primario' ? color.acento : tipo === 'secundario' ? color.acentoSuave : 'transparent';
  const tinta = tipo === 'primario' ? '#FFFFFF' : tipo === 'secundario' ? color.acentoTexto : color.texto;
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      style={({ pressed }) => [s.boton, { backgroundColor: fondo }, (pressed || deshabilitado) && { opacity: deshabilitado ? 0.4 : 0.8 }, estilo]}
    >
      {icono ? <Ionicons name={icono} size={18} color={tinta} /> : null}
      <Text style={[s.botonTexto, { color: tinta }]}>{titulo}</Text>
    </Pressable>
  );
}

export function BotonIcono({ icono, onPress, etiqueta }: { icono: Icono; onPress: () => void; etiqueta: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityLabel={etiqueta} style={({ pressed }) => [s.botonIcono, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icono} size={20} color={color.texto} />
    </Pressable>
  );
}

export function Encabezado({ titulo, subtitulo, onVolver, derecha, grande }: {
  titulo: string; subtitulo?: string; onVolver?: () => void; derecha?: ReactNode; grande?: boolean;
}) {
  return (
    <View style={[s.encabezado, grande && { paddingTop: espacio(4), paddingBottom: espacio(2) }]}>
      {onVolver ? <BotonIcono icono="chevron-back" onPress={onVolver} etiqueta="Volver" /> : null}
      <View style={{ flex: 1 }}>
        <Text style={grande ? s.tituloGrande : s.titulo} numberOfLines={1}>{titulo}</Text>
        {subtitulo ? <Text style={s.suave} numberOfLines={1}>{subtitulo}</Text> : null}
      </View>
      {derecha}
    </View>
  );
}

export function Tarjeta({ children, estilo, onPress }: { children: ReactNode; estilo?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.tarjeta, estilo, pressed && { transform: [{ scale: 0.99 }], opacity: 0.95 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.tarjeta, estilo]}>{children}</View>;
}

export function BarraProgreso({ valor, estilo }: { valor: number; estilo?: StyleProp<ViewStyle> }) {
  return (
    <View style={[s.pista, estilo]}>
      <View style={[s.relleno, { width: `${Math.round(Math.max(0, Math.min(1, valor)) * 100)}%` }]} />
    </View>
  );
}

export function Chip({ texto, icono, tono = 'neutro' }: { texto: string; icono?: Icono; tono?: 'neutro' | 'acento' | 'bien' | 'mal' }) {
  const [bg, fg] = tono === 'acento' ? [color.acentoSuave, color.acentoTexto] : tono === 'bien' ? [color.bienFondo, color.bien] : tono === 'mal' ? [color.malFondo, color.mal] : [color.superficie, color.suave];
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      {icono ? <Ionicons name={icono} size={13} color={fg} /> : null}
      <Text style={[s.chipTexto, { color: fg }]}>{texto}</Text>
    </View>
  );
}

/** Texto con **negrita** y `código` en línea. */
export function Parrafo({ texto, estilo }: { texto: string; estilo?: StyleProp<TextStyle> }) {
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <Text style={[s.texto, estilo]}>
      {partes.map((p, i) =>
        p.startsWith('**') ? <Text key={i} style={{ fontWeight: '700' }}>{p.slice(2, -2)}</Text>
          : p.startsWith('`') ? <Text key={i} style={s.codigoEnLinea}>{p.slice(1, -1)}</Text>
          : <Text key={i}>{p}</Text>,
      )}
    </Text>
  );
}

/** Bloque de código oscuro con números de línea. `resaltadas`: líneas en foco; `marcadas`: líneas con error. */
export function CodigoNumerado({ lineas, marcadas = [], resaltadas = [], onLinea }: {
  lineas: string[]; marcadas?: number[]; resaltadas?: number[]; onLinea?: (n: number) => void;
}) {
  return (
    <View style={s.codigo}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: espacio(3), minWidth: '100%' }}>
        <View style={{ minWidth: '100%' }}>
          {lineas.map((l, i) => {
            const n = i + 1, error = marcadas.includes(n), foco = resaltadas.includes(n);
            return (
              <Pressable key={i} disabled={!onLinea} onPress={() => onLinea?.(n)}
                style={[s.codigoLinea, foco && { backgroundColor: color.codigoResaltado }, error && { backgroundColor: color.codigoError }]}>
                <View style={[s.marcaLinea, foco && { backgroundColor: color.acento }, error && { backgroundColor: color.mal }]} />
                <Text style={[s.nro, (foco || error) && { color: color.codigoTexto }]}>{n}</Text>
                <Text style={s.codigoTexto}>{l || ' '}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

export function BarraInferior({ children }: { children: ReactNode }) {
  return <View style={s.barra}>{children}</View>;
}

export const s = StyleSheet.create({
  boton: { minHeight: 48, paddingHorizontal: espacio(4), borderRadius: radio.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: espacio(2), flex: 1 },
  botonTexto: { fontSize: 15, fontWeight: '700' },
  botonIcono: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.tarjeta, alignItems: 'center', justifyContent: 'center', ...sombra },
  encabezado: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: espacio(4), paddingVertical: espacio(3), gap: espacio(3) },
  titulo: { fontSize: 18, fontWeight: '700', color: color.texto },
  tituloGrande: { fontSize: 30, fontWeight: '800', color: color.texto, letterSpacing: -0.5 },
  tarjeta: { backgroundColor: color.tarjeta, borderRadius: radio.lg, padding: espacio(4), ...sombra },
  pista: { height: 6, borderRadius: 3, backgroundColor: color.superficie, overflow: 'hidden' },
  relleno: { height: '100%', borderRadius: 3, backgroundColor: color.acento },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: espacio(2), paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  chipTexto: { fontSize: 12, fontWeight: '600' },
  codigo: { backgroundColor: color.codigoFondo, borderRadius: radio.md, overflow: 'hidden' },
  codigoLinea: { flexDirection: 'row', alignItems: 'center', paddingRight: espacio(4) },
  marcaLinea: { width: 3, alignSelf: 'stretch', marginRight: espacio(2) },
  nro: { width: 26, fontFamily: mono, fontSize: 12, lineHeight: 20, color: color.codigoSuave },
  codigoTexto: { fontFamily: mono, fontSize: 13, lineHeight: 20, color: color.codigoTexto },
  codigoEnLinea: { fontFamily: mono, fontSize: 14, color: color.acentoTexto, backgroundColor: color.acentoSuave },
  texto: { fontSize: 15, lineHeight: 23, color: color.texto },
  suave: { fontSize: 13, lineHeight: 18, color: color.suave },
  seccion: { fontSize: 13, fontWeight: '700', color: color.suave, textTransform: 'uppercase', letterSpacing: 0.6 },
  barra: { flexDirection: 'row', alignItems: 'center', gap: espacio(2), paddingHorizontal: espacio(4), paddingVertical: espacio(3), backgroundColor: color.tarjeta, borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.borde },
});
