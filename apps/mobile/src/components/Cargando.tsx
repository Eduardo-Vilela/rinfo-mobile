import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Modal, StyleSheet, Text, View } from 'react-native';
import { color, espacio, radio, sombra } from '../theme';

/** Indicador de carga a pantalla completa, sobre un velo, con un mensaje y un detalle opcional. */
export function Cargando({ visible, mensaje, detalle }: { visible: boolean; mensaje: string; detalle?: string }) {
  const [escala] = useState(() => new Animated.Value(0.92));
  useEffect(() => {
    if (visible) Animated.spring(escala, { toValue: 1, useNativeDriver: true, friction: 6 }).start();
    else escala.setValue(0.92);
  }, [visible, escala]);
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={st.velo} accessibilityLiveRegion="polite" accessibilityLabel={mensaje}>
        <Animated.View style={[st.caja, { transform: [{ scale: escala }] }]}>
          <ActivityIndicator size="large" color={color.acento} />
          <Text style={st.mensaje}>{mensaje}</Text>
          {detalle ? <Text style={st.detalle}>{detalle}</Text> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  velo: { flex: 1, backgroundColor: 'rgba(22,22,29,0.35)', alignItems: 'center', justifyContent: 'center', padding: espacio(8) },
  caja: { backgroundColor: color.tarjeta, borderRadius: radio.lg, paddingVertical: espacio(6), paddingHorizontal: espacio(8), alignItems: 'center', gap: espacio(3), minWidth: 220, ...sombra },
  mensaje: { fontSize: 17, fontWeight: '700', color: color.texto, textAlign: 'center' },
  detalle: { fontSize: 13, color: color.suave, textAlign: 'center' },
});
