import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { compilar, type EjercicioVerdaderoFalso } from 'rinfo-core';
import { Ciudad } from '../components/Ciudad';
import { mayuscula, BarraInferior, Boton, CodigoNumerado, Encabezado, Parrafo, s as ui, Tarjeta } from '../components/ui';
import { marcarResuelto } from '../storage';
import { color, espacio, radio } from '../theme';

export function VerdaderoFalso({ ejercicio, onVolver }: { ejercicio: EjercicioVerdaderoFalso; onVolver: () => void }) {
  const programa = useMemo(() => compilar(ejercicio.programa.join('\n')).programa, [ejercicio]);
  const ejemplos = ejercicio.ejemplos ?? [];
  const [ejemplo, setEjemplo] = useState(0);
  const [linea, setLinea] = useState<number | undefined>();
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
      <Encabezado titulo={ejercicio.titulo} subtitulo="Verdadero o falso" onVolver={onVolver} />
      <ScrollView contentContainerStyle={{ padding: espacio(4), gap: espacio(4), paddingBottom: espacio(10) }}>
        <Parrafo texto={ejercicio.enunciado} />
        <CodigoNumerado lineas={ejercicio.programa} resaltadas={linea ? [linea] : []} />

        {programa && ejemplos.length ? (
          <View style={{ gap: espacio(2) }}>
            <Text style={ui.seccion}>Probalo en distintas ciudades</Text>
            <Text style={ui.suave}>Las afirmaciones hablan de cualquier ciudad posible. Estos ejemplos te ayudan a buscar casos que las confirmen o las desmientan.</Text>
            <View style={st.chips}>
              {ejemplos.map((e, k) => (
                <Pressable key={k} onPress={() => setEjemplo(k)} style={[st.chip, ejemplo === k && st.chipActivo]}>
                  <Text style={[st.chipTexto, ejemplo === k && { color: color.acentoTexto }]}>{mayuscula(e.nombre ?? `Ciudad ${k + 1}`)}</Text>
                </Pressable>
              ))}
            </View>
            <Ciudad key={ejemplo} programa={programa} escenario={ejemplos[ejemplo]} semilla={1000 * (ejemplo + 1)} onLinea={setLinea} />
          </View>
        ) : null}

        {comprobado && (
          <Tarjeta estilo={{ flexDirection: 'row', alignItems: 'center', gap: espacio(3), backgroundColor: aciertos === elegidas.length ? color.bienFondo : color.tarjeta }}>
            <Ionicons name={aciertos === elegidas.length ? 'trophy' : 'ribbon-outline'} size={26} color={color.acento} />
            <Text style={st.grande}>{aciertos} de {elegidas.length} correctas</Text>
          </Tarjeta>
        )}

        {ejercicio.afirmaciones.map((a, i) => {
          const bien = elegidas[i] === a.respuesta;
          return (
            <Tarjeta key={i} estilo={{ gap: espacio(3) }}>
              <Text style={ui.texto}><Text style={{ fontWeight: '800' }}>{String.fromCharCode(97 + i)})</Text> {a.texto}</Text>
              <View style={{ flexDirection: 'row', gap: espacio(2) }}>
                {[true, false].map((v) => (
                  <Pressable key={String(v)} onPress={() => !comprobado && setElegidas((e) => e.map((x, k) => (k === i ? v : x)))}
                    style={[st.opcion, elegidas[i] === v && st.opcionActiva]}>
                    <Text style={[st.opcionTexto, elegidas[i] === v && { color: color.acentoTexto }]}>{v ? 'Verdadero' : 'Falso'}</Text>
                  </Pressable>
                ))}
              </View>
              {comprobado && (
                <View style={[st.just, { backgroundColor: bien ? color.bienFondo : color.malFondo }]}>
                  <Text style={[st.veredicto, { color: bien ? color.bien : color.mal }]}>{bien ? 'Correcto' : `Es ${a.respuesta ? 'verdadera' : 'falsa'}`}</Text>
                  <Text style={ui.texto}>{a.justificacion}</Text>
                </View>
              )}
            </Tarjeta>
          );
        })}
      </ScrollView>
      <BarraInferior>
        {comprobado ? <Boton titulo="Listo" onPress={onVolver} /> : <Boton titulo="Comprobar" onPress={comprobar} deshabilitado={!completas} />}
      </BarraInferior>
    </View>
  );
}

const st = StyleSheet.create({
  grande: { fontSize: 17, fontWeight: '700', color: color.texto },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio(2) },
  chip: { paddingHorizontal: espacio(3), paddingVertical: espacio(2), borderRadius: 999, backgroundColor: color.tarjeta, borderWidth: 1.5, borderColor: color.borde },
  chipActivo: { borderColor: color.acento, backgroundColor: color.acentoSuave },
  chipTexto: { fontSize: 13, fontWeight: '600', color: color.texto },
  opcion: { flex: 1, alignItems: 'center', paddingVertical: espacio(3), borderRadius: radio.md, borderWidth: 1.5, borderColor: color.borde, backgroundColor: color.tarjeta },
  opcionActiva: { backgroundColor: color.acentoSuave, borderColor: color.acento },
  opcionTexto: { fontSize: 15, fontWeight: '600', color: color.texto },
  just: { borderRadius: radio.sm, padding: espacio(3), gap: 4 },
  veredicto: { fontSize: 14, fontWeight: '800' },
});
