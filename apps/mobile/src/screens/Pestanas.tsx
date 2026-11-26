import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CAPITULOS, EJERCICIOS, LECCIONES, type Ejercicio, type EjercicioPrograma, type Leccion } from 'rinfo-core';
import { Pantalla } from '../components/Pantalla';
import { BarraProgreso, Boton, Chip, Encabezado, s as ui, Tarjeta } from '../components/ui';
import { useProgreso } from '../progreso';
import { color, espacio, radio } from '../theme';

export type Modulo = 'aprender' | 'practicar' | 'examen';

/** Progreso guardado (cargado al abrir la app), releído cada vez que la pestaña vuelve a estar en foco. */
function useProgresoEnFoco() {
  const progreso = useProgreso();
  const { recargar } = progreso;
  useFocusEffect(useCallback(() => { recargar(); }, [recargar]));
  return progreso;
}

const abrirLeccion = (l: Leccion) => router.push({ pathname: '/leccion/[id]', params: { id: l.id } });
const abrirEjercicio = (e: Ejercicio, examen = false) =>
  e.tipo === 'programa'
    ? router.push({ pathname: '/ejercicio/[id]', params: { id: e.id, examen: examen ? '1' : '0' } })
    : router.push({ pathname: '/actividad/[id]', params: { id: e.id } });

function Lista({ children }: { children: ReactNode }) {
  return (
    <Pantalla bordes={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: espacio(8) }}>{children}</ScrollView>
    </Pantalla>
  );
}

export function PestanaAprender() {
  const { resueltos, lecciones } = useProgresoEnFoco();
  return <Lista><Aprender lecciones={lecciones} resueltos={resueltos} abrirLeccion={abrirLeccion} /></Lista>;
}
export function PestanaPracticar() {
  const { resueltos } = useProgresoEnFoco();
  return <Lista><Practicar resueltos={resueltos} abrir={(e) => abrirEjercicio(e)} /></Lista>;
}
export function PestanaExamen() {
  const { resueltos } = useProgresoEnFoco();
  return <Lista><Examen resueltos={resueltos} abrir={(e) => abrirEjercicio(e, true)} simulacro={simulacro} /></Lista>;
}

const azar = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);
/** Un ejercicio de tipo examen y otro de práctica de nivel 2 o más. */
function simulacro() {
  const programas = EJERCICIOS.filter((e): e is EjercicioPrograma => e.tipo === 'programa');
  const examen = programas.filter((e) => e.modulo === 'examen');
  const resto = programas.filter((e) => e.modulo !== 'examen' && e.dificultad >= 2);
  const cola = [...azar(examen).slice(0, 1), ...azar(resto).slice(0, 1)].map((e) => e.id);
  router.push({ pathname: '/ejercicio/[id]', params: { id: cola[0], examen: '1', cola: cola.join(','), k: '0' } });
}

function Aprender({ lecciones, resueltos, abrirLeccion }: { lecciones: Set<string>; resueltos: Set<string>; abrirLeccion: (l: Leccion) => void }) {
  const hechas = LECCIONES.filter((l) => lecciones.has(l.id)).length;
  const siguiente = LECCIONES.find((l) => !lecciones.has(l.id));
  return (
    <>
      <Encabezado grande titulo="Aprender" subtitulo="Curso de ingreso · Informática UNLP" />
      <View style={st.contenido}>
        <Tarjeta estilo={{ gap: espacio(3) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={st.tarjetaTitulo}>Tu avance</Text>
            <Text style={[ui.suave, { marginLeft: 'auto' }]}>{hechas} de {LECCIONES.length} lecciones</Text>
          </View>
          <BarraProgreso valor={hechas / LECCIONES.length} />
          {siguiente ? <Boton titulo={`Seguir: ${siguiente.titulo}`} icono="arrow-forward" onPress={() => abrirLeccion(siguiente)} /> : null}
        </Tarjeta>
        {LECCIONES.map((l) => {
          const hecha = lecciones.has(l.id);
          const actividades = l.actividades.length;
          const resueltas = l.actividades.filter((id) => resueltos.has(id)).length;
          return (
            <Tarjeta key={l.id} onPress={() => abrirLeccion(l)} estilo={st.leccion}>
              <View style={[st.numero, hecha && { backgroundColor: color.bienFondo }]}>
                {hecha ? <Ionicons name="checkmark" size={20} color={color.bien} /> : <Text style={st.numeroTexto}>{l.capitulo}</Text>}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={st.leccionTitulo}>{l.titulo}</Text>
                <Text style={ui.suave}>{l.resumen}</Text>
                <View style={{ flexDirection: 'row', gap: espacio(2), marginTop: 2, flexWrap: 'wrap' }}>
                  <Chip texto={`${l.minutos} min`} icono="time-outline" />
                  {actividades ? <Chip texto={`${resueltas}/${actividades} actividades`} icono="extension-puzzle-outline" tono={resueltas === actividades ? 'bien' : 'neutro'} /> : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.suave} />
            </Tarjeta>
          );
        })}
      </View>
    </>
  );
}

function Fila({ e, resuelto, onPress, ultimo }: { e: Ejercicio; resuelto: boolean; onPress: () => void; ultimo: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.fila, !ultimo && st.filaBorde, pressed && { opacity: 0.6 }]}>
      <View style={[st.dot, resuelto && { backgroundColor: color.bien, borderColor: color.bien }]}>
        {resuelto ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={st.filaTitulo}>{e.titulo}</Text>
        <Text style={ui.suave}>Nivel {e.dificultad} · {e.tema}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={color.suave} />
    </Pressable>
  );
}

function Grupo({ titulo, items, resueltos, abrir }: { titulo: string; items: Ejercicio[]; resueltos: Set<string>; abrir: (e: Ejercicio) => void }) {
  const hechos = items.filter((e) => resueltos.has(e.id)).length;
  return (
    <View style={{ gap: espacio(2) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: espacio(1) }}>
        <Text style={ui.seccion}>{titulo}</Text>
        <Text style={[ui.suave, { marginLeft: 'auto' }]}>{hechos}/{items.length}</Text>
      </View>
      <Tarjeta estilo={{ paddingVertical: 0 }}>
        {items.map((e, i) => <Fila key={e.id} e={e} resuelto={resueltos.has(e.id)} onPress={() => abrir(e)} ultimo={i === items.length - 1} />)}
      </Tarjeta>
    </View>
  );
}

function Practicar({ resueltos, abrir }: { resueltos: Set<string>; abrir: (e: Ejercicio) => void }) {
  const programas = EJERCICIOS.filter((e) => e.tipo === 'programa');
  const hechos = programas.filter((e) => resueltos.has(e.id)).length;
  return (
    <>
      <Encabezado grande titulo="Practicar" subtitulo="Escribí el programa completo y probalo en el mapa" />
      <View style={st.contenido}>
        <Tarjeta estilo={{ gap: espacio(3) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={st.tarjetaTitulo}>Ejercicios resueltos</Text>
            <Text style={[ui.suave, { marginLeft: 'auto' }]}>{hechos} de {programas.length}</Text>
          </View>
          <BarraProgreso valor={hechos / programas.length} />
        </Tarjeta>
        {CAPITULOS.map((cap) => {
          const items = cap.ejercicios.filter((e) => e.tipo === 'programa');
          return items.length ? <Grupo key={cap.capitulo} titulo={cap.capitulo} items={items} resueltos={resueltos} abrir={abrir} /> : null;
        })}
      </View>
    </>
  );
}

function Examen({ resueltos, abrir, simulacro }: { resueltos: Set<string>; abrir: (e: Ejercicio) => void; simulacro: () => void }) {
  const deExamen = EJERCICIOS.filter((e): e is EjercicioPrograma => e.tipo === 'programa' && e.modulo === 'examen');
  return (
    <>
      <Encabezado grande titulo="Examen" subtitulo="Hoja en blanco, con tiempo y una sola entrega" />
      <View style={st.contenido}>
        <View style={st.heroe}>
          <Ionicons name="timer" size={28} color="#FFFFFF" />
          <Text style={st.heroeTitulo}>Simulacro</Text>
          <Text style={st.heroeTexto}>Dos ejercicios al azar, sin compilar antes de entregar. Como en el escrito.</Text>
          <Pressable onPress={simulacro} style={({ pressed }) => [st.heroeBoton, pressed && { opacity: 0.85 }]}>
            <Text style={st.heroeBotonTexto}>Empezar</Text>
            <Ionicons name="arrow-forward" size={18} color={color.acentoTexto} />
          </Pressable>
        </View>
        <Grupo titulo="Ejercicios tipo examen" items={deExamen} resueltos={resueltos} abrir={abrir} />
      </View>
    </>
  );
}

const st = StyleSheet.create({
  contenido: { paddingHorizontal: espacio(4), gap: espacio(4), paddingTop: espacio(2) },
  tarjetaTitulo: { fontSize: 16, fontWeight: '700', color: color.texto },
  leccion: { flexDirection: 'row', alignItems: 'center', gap: espacio(3) },
  numero: { width: 44, height: 44, borderRadius: 14, backgroundColor: color.acentoSuave, alignItems: 'center', justifyContent: 'center' },
  numeroTexto: { fontSize: 18, fontWeight: '800', color: color.acentoTexto },
  leccionTitulo: { fontSize: 16, fontWeight: '700', color: color.texto },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espacio(3), paddingVertical: espacio(3) + 2 },
  filaBorde: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.borde },
  filaTitulo: { fontSize: 15, fontWeight: '600', color: color.texto },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: color.bordeControl, alignItems: 'center', justifyContent: 'center' },
  heroe: { backgroundColor: color.acento, borderRadius: radio.lg, padding: espacio(5), gap: espacio(2) },
  heroeTitulo: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', marginTop: espacio(1) },
  heroeTexto: { fontSize: 14, lineHeight: 20, color: '#E0E3FF' },
  heroeBoton: { marginTop: espacio(2), alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: espacio(2), backgroundColor: '#FFFFFF', paddingHorizontal: espacio(5), paddingVertical: espacio(3), borderRadius: radio.md },
  heroeBotonTexto: { fontSize: 15, fontWeight: '700', color: color.acentoTexto },
});
