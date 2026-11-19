import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EjercicioVerdaderoFalso } from 'rinfo-core';
import { Boton, CodigoNumerado, Encabezado, s as ui } from '../components/ui';
import { marcarResuelto } from '../storage';
import { color, espacio } from '../theme';

export function VerdaderoFalso({ ejercicio, onVolver }: { ejercicio: EjercicioVerdaderoFalso; onVolver: () => void }) {
  const [elegidas, setElegidas] = useState<(boolean | null)[]>(ejercicio.afirmaciones.map(() => null));
  const [comprobado, setComprobado] = useState(false);
  const completas = elegidas.every((x) => x !== null);
  const aciertos = ejercicio.afirmaciones.filter((a, i) => elegidas[i] === a.respuesta).length;

  function comprobar() {
    setComprobado(true);
    if (aciertos === ejercicio.afirmaciones.length) marcarResuelto(ejercicio.id);
  }

  return (
    <View style={{ flex: 1 }}>
      <Encabezado titulo={ejercicio.titulo} onVolver={onVolver} />
      <ScrollView contentContainerStyle={{ padding: espacio(4), gap: espacio(4), paddingBottom: espacio(12) }}>
        <Text style={ui.texto}>{ejercicio.enunciado}</Text>
        <CodigoNumerado lineas={ejercicio.programa} />
        {comprobado && (
          <View style={[ui.tarjeta, { backgroundColor: aciertos === elegidas.length ? color.bienFondo : color.superficie }]}>
            <Text style={st.grande}>{aciertos} de {elegidas.length} correctas</Text>
          </View>
        )}
        {ejercicio.afirmaciones.map((a, i) => {
          const bien = elegidas[i] === a.respuesta;
          return (
            <View key={i} style={st.item}>
              <Text style={ui.texto}>{String.fromCharCode(97 + i)}) {a.texto}</Text>
              <View style={{ flexDirection: 'row', gap: espacio(2) }}>
                {[true, false].map((v) => (
                  <Pressable
                    key={String(v)}
                    onPress={() => !comprobado && setElegidas((e) => e.map((x, k) => (k === i ? v : x)))}
                    style={[st.opcion, elegidas[i] === v && st.opcionActiva]}
                  >
                    <Text style={[ui.texto, elegidas[i] === v && { color: color.fondo }]}>{v ? 'Verdadero' : 'Falso'}</Text>
                  </Pressable>
                ))}
              </View>
              {comprobado && (
                <View style={{ gap: 2 }}>
                  <Text style={[st.veredicto, { color: bien ? color.bien : color.mal }]}>
                    {bien ? 'Correcto' : `Es ${a.respuesta ? 'verdadera' : 'falsa'}`}
                  </Text>
                  <Text style={ui.texto}>{a.justificacion}</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      <View style={st.barra}>
        {comprobado ? <Boton titulo="Listo" onPress={onVolver} /> : <Boton titulo="Comprobar" onPress={comprobar} deshabilitado={!completas} />}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  grande: { fontSize: 17, fontWeight: '600', color: color.texto },
  item: { gap: espacio(2), paddingBottom: espacio(4), borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.borde },
  opcion: { flex: 1, alignItems: 'center', paddingVertical: espacio(3), borderRadius: 10, borderWidth: 1, borderColor: color.bordeControl },
  opcionActiva: { backgroundColor: color.texto, borderColor: color.texto },
  veredicto: { fontSize: 13, fontWeight: '700' },
  barra: { flexDirection: 'row', padding: espacio(3), borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.borde },
});
