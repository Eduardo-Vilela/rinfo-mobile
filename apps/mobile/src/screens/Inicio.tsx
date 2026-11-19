import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CAPITULOS, type Ejercicio } from 'rinfo-core';
import { Boton, Encabezado, s as ui } from '../components/ui';
import { leerResueltos } from '../storage';
import { color, espacio } from '../theme';

export type Modulo = 'aprender' | 'practicar' | 'examen';

const MODULOS: { id: Modulo; titulo: string; ayuda: string }[] = [
  { id: 'aprender', titulo: 'Aprender', ayuda: 'Leé programas y predecí qué hacen.' },
  { id: 'practicar', titulo: 'Practicar', ayuda: 'Escribí el programa. Podés compilar las veces que quieras.' },
  { id: 'examen', titulo: 'Examen', ayuda: 'Como en el escrito: con tiempo y una sola entrega.' },
];

function visibleEn(e: Ejercicio, m: Modulo) {
  if (m === 'aprender') return e.tipo !== 'programa';
  return e.tipo === 'programa';
}

export function Inicio({ modulo, setModulo, abrir, simulacro }: {
  modulo: Modulo;
  setModulo: (m: Modulo) => void;
  abrir: (e: Ejercicio, m: Modulo) => void;
  simulacro: () => void;
}) {
  const [resueltos, setResueltos] = useState<Set<string>>(new Set());
  useEffect(() => { leerResueltos().then(setResueltos); }, [modulo]);
  const info = MODULOS.find((m) => m.id === modulo)!;

  return (
    <View style={{ flex: 1 }}>
      <Encabezado titulo="R-Info" />
      <View style={st.segmentos}>
        {MODULOS.map((m) => (
          <Pressable key={m.id} onPress={() => setModulo(m.id)} style={[st.segmento, modulo === m.id && st.segmentoActivo]}>
            <Text style={[st.segmentoTexto, modulo === m.id && { color: color.texto }]}>{m.titulo}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ padding: espacio(4), gap: espacio(6), paddingBottom: espacio(12) }}>
        <Text style={ui.suave}>{info.ayuda}</Text>
        {modulo === 'examen' ? (
          <View style={{ flexDirection: 'row' }}>
            <Boton titulo="Simulacro al azar" onPress={simulacro} />
          </View>
        ) : null}
        {CAPITULOS.map((cap) => {
          const items = cap.ejercicios.filter((e) => visibleEn(e, modulo));
          if (!items.length) return null;
          return (
            <View key={cap.capitulo} style={{ gap: espacio(2) }}>
              <Text style={st.capitulo}>{cap.capitulo}</Text>
              {items.map((e) => (
                <Pressable key={e.id} onPress={() => abrir(e, modulo)} style={({ pressed }) => [st.fila, pressed && { opacity: 0.6 }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={st.filaTitulo}>{e.titulo}</Text>
                    <Text style={ui.suave}>{'●'.repeat(e.dificultad) + '○'.repeat(3 - e.dificultad)}  ·  {e.tema}</Text>
                  </View>
                  {resueltos.has(e.id) ? <Text style={st.check}>✓</Text> : null}
                </Pressable>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  segmentos: { flexDirection: 'row', marginHorizontal: espacio(4), backgroundColor: color.superficie, borderRadius: 10, padding: 3 },
  segmento: { flex: 1, paddingVertical: espacio(2), alignItems: 'center', borderRadius: 8 },
  segmentoActivo: { backgroundColor: color.fondo, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  segmentoTexto: { fontSize: 14, fontWeight: '600', color: color.suave },
  capitulo: { fontSize: 13, fontWeight: '600', color: color.suave, textTransform: 'uppercase', letterSpacing: 0.5 },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: espacio(3), borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.borde },
  filaTitulo: { fontSize: 16, color: color.texto },
  check: { fontSize: 18, color: color.bien, fontWeight: '700' },
});
