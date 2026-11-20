import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { compilar, EJERCICIOS, type Ejercicio, type Leccion as TLeccion, type Seccion } from 'rinfo-core';
import { Ciudad } from '../components/Ciudad';
import { BarraInferior, BarraProgreso, Boton, BotonIcono, Chip, CodigoNumerado, Parrafo, s as ui, Tarjeta } from '../components/ui';
import { marcarLeccion } from '../storage';
import { color, espacio, radio } from '../theme';

export function Leccion({ leccion, onVolver, abrir, alFinal }: { leccion: TLeccion; onVolver: () => void; abrir: (e: Ejercicio) => void; alFinal?: boolean }) {
  const [i, setI] = useState(alFinal ? leccion.secciones.length : 0);
  const [listas, setListas] = useState<Set<number>>(new Set());
  const scroll = useRef<ScrollViewInstance>(null);
  const total = leccion.secciones.length;
  const fin = i >= total;
  const seccion = leccion.secciones[i];
  const puedeSeguir = fin || seccion.tipo !== 'pregunta' || listas.has(i);

  function ir(n: number) {
    setI(n);
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (n >= total) marcarLeccion(leccion.id);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={st.arriba}>
        <BotonIcono icono="close" onPress={onVolver} etiqueta="Cerrar la lección" />
        <BarraProgreso valor={Math.min(i, total) / total} estilo={{ flex: 1 }} />
        <Text style={ui.suave}>{Math.min(i + 1, total)}/{total}</Text>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: espacio(4), gap: espacio(4), paddingBottom: espacio(10) }}>
        {fin ? (
          <Final leccion={leccion} abrir={abrir} />
        ) : (
          <SeccionVista key={i} seccion={seccion} onLista={() => setListas((s) => new Set(s).add(i))} />
        )}
      </ScrollView>
      <BarraInferior>
        {i > 0 ? <Boton titulo="" icono="arrow-back" tipo="secundario" onPress={() => ir(i - 1)} estilo={{ flex: 0, width: 52 }} /> : null}
        {fin
          ? <Boton titulo="Volver a las lecciones" onPress={onVolver} />
          : <Boton titulo={i === total - 1 ? 'Terminar' : 'Continuar'} icono="arrow-forward" onPress={() => ir(i + 1)} deshabilitado={!puedeSeguir} />}
      </BarraInferior>
    </View>
  );
}

function SeccionVista({ seccion, onLista }: { seccion: Seccion; onLista: () => void }) {
  if (seccion.tipo === 'concepto') {
    return (
      <View style={{ gap: espacio(3) }}>
        <Chip texto="Concepto" icono="bulb-outline" tono="acento" />
        <Text style={st.titulo}>{seccion.titulo}</Text>
        {seccion.texto.map((t, k) => <Parrafo key={k} texto={t} />)}
        {seccion.codigo ? <CodigoNumerado lineas={seccion.codigo} /> : null}
      </View>
    );
  }
  if (seccion.tipo === 'ejemplo') return <Ejemplo seccion={seccion} />;
  return <Pregunta seccion={seccion} onRespondida={onLista} />;
}

function Ejemplo({ seccion }: { seccion: Extract<Seccion, { tipo: 'ejemplo' }> }) {
  const programa = useMemo(() => compilar(seccion.programa.join('\n')).programa, [seccion]);
  const [paso, setPaso] = useState<number | null>(null);
  const [linea, setLinea] = useState<number | undefined>();
  const resaltadas = linea !== undefined ? [linea]
    : paso !== null ? range(seccion.pasos[paso].lineas[0], seccion.pasos[paso].lineas[1]) : [];
  // Paso del castellano que corresponde a la línea que se está ejecutando.
  const pasoActivo = linea !== undefined ? seccion.pasos.findIndex((p) => linea >= p.lineas[0] && linea <= p.lineas[1]) : paso;

  return (
    <View style={{ gap: espacio(4) }}>
      <Chip texto="Ejemplo" icono="flask-outline" tono="acento" />
      <Text style={st.titulo}>{seccion.titulo}</Text>

      <Tarjeta estilo={{ gap: espacio(2) }}>
        <Text style={ui.seccion}>1 · El problema</Text>
        <Parrafo texto={seccion.problema} />
      </Tarjeta>

      <Tarjeta estilo={{ gap: espacio(2) }}>
        <Text style={ui.seccion}>2 · Pensalo en castellano</Text>
        <Text style={ui.suave}>Tocá un paso para ver qué líneas del código lo resuelven.</Text>
        {seccion.pasos.map((p, k) => (
          <Pressable key={k} onPress={() => { setLinea(undefined); setPaso(paso === k ? null : k); }}
            style={[st.paso, pasoActivo === k && st.pasoActivo]}>
            <View style={[st.pasoNro, pasoActivo === k && { backgroundColor: color.acento }]}>
              <Text style={[st.pasoNroTexto, pasoActivo === k && { color: '#FFFFFF' }]}>{k + 1}</Text>
            </View>
            <Text style={[ui.texto, { flex: 1 }]}>{p.texto}</Text>
          </Pressable>
        ))}
      </Tarjeta>

      <View style={{ gap: espacio(2) }}>
        <Text style={ui.seccion}>3 · El código</Text>
        <CodigoNumerado lineas={seccion.programa} resaltadas={resaltadas} />
      </View>

      {programa ? (
        <View style={{ gap: espacio(2) }}>
          <Text style={ui.seccion}>4 · Miralo en la ciudad</Text>
          <Text style={ui.suave}>Mientras se ejecuta, se resalta la línea y el paso en castellano que está haciendo el robot.</Text>
          <Ciudad programa={programa} escenario={seccion.escenario} onLinea={setLinea} />
        </View>
      ) : null}

      {seccion.cierre ? (
        <View style={st.nota}>
          <Ionicons name="sparkles-outline" size={18} color={color.acentoTexto} />
          <Parrafo texto={seccion.cierre} estilo={{ flex: 1 }} />
        </View>
      ) : null}
    </View>
  );
}

function Pregunta({ seccion, onRespondida }: { seccion: Extract<Seccion, { tipo: 'pregunta' }>; onRespondida: () => void }) {
  const programa = useMemo(() => (seccion.programa?.[0]?.startsWith('programa') ? compilar(seccion.programa.join('\n')).programa : undefined), [seccion]);
  const [elegida, setElegida] = useState<number | null>(null);
  const [comprobada, setComprobada] = useState(false);
  const [espio, setEspio] = useState(false);
  const bien = elegida === seccion.correcta;

  return (
    <View style={{ gap: espacio(4) }}>
      <Chip texto="Pregunta" icono="help-circle-outline" tono="acento" />
      <Parrafo texto={seccion.pregunta} estilo={st.pregunta} />
      {seccion.programa ? <CodigoNumerado lineas={seccion.programa} /> : null}
      {seccion.escenario ? (
        <View style={{ gap: espacio(2) }}>
          <Text style={ui.suave}>Así está la ciudad antes de ejecutar. Usala para deducir la respuesta.</Text>
          <Ciudad escenario={seccion.escenario} programa={programa} bloqueada={!comprobada && !espio} onDesbloquear={() => setEspio(true)} />
        </View>
      ) : null}
      <View style={{ gap: espacio(2) }}>
        {seccion.opciones.map((o, k) => {
          const esta = elegida === k;
          const correcta = comprobada && k === seccion.correcta;
          const mal = comprobada && esta && !bien;
          return (
            <Pressable key={k} disabled={comprobada} onPress={() => setElegida(k)}
              style={[st.opcion, esta && st.opcionElegida, correcta && st.opcionBien, mal && st.opcionMal]}>
              <View style={[st.radio, esta && { borderColor: color.acento }, correcta && { borderColor: color.bien, backgroundColor: color.bien }, mal && { borderColor: color.mal, backgroundColor: color.mal }]}>
                {correcta ? <Ionicons name="checkmark" size={12} color="#FFFFFF" /> : mal ? <Ionicons name="close" size={12} color="#FFFFFF" /> : esta ? <View style={st.radioPunto} /> : null}
              </View>
              <Parrafo texto={o} estilo={{ flex: 1 }} />
            </Pressable>
          );
        })}
      </View>
      {comprobada ? (
        <View style={[st.nota, { backgroundColor: bien ? color.bienFondo : color.malFondo }]}>
          <Ionicons name={bien ? 'checkmark-circle' : 'information-circle'} size={20} color={bien ? color.bien : color.mal} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[st.veredicto, { color: bien ? color.bien : color.mal }]}>{bien ? (espio ? 'Correcto (mirando la ejecución)' : 'Correcto') : 'No es esa'}</Text>
            <Parrafo texto={seccion.explicacion} />
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row' }}>
          <Boton titulo="Comprobar" tipo="secundario" onPress={() => { setComprobada(true); onRespondida(); }} deshabilitado={elegida === null} />
        </View>
      )}
    </View>
  );
}

function Final({ leccion, abrir }: { leccion: TLeccion; abrir: (e: Ejercicio) => void }) {
  const actividades = leccion.actividades.map((id) => EJERCICIOS.find((e) => e.id === id)!).filter(Boolean);
  return (
    <View style={{ gap: espacio(4), alignItems: 'stretch' }}>
      <View style={st.festejo}>
        <Ionicons name="trophy" size={40} color={color.acento} />
        <Text style={st.titulo}>Lección completada</Text>
        <Text style={[ui.texto, { textAlign: 'center' }]}>{leccion.titulo}</Text>
      </View>
      {actividades.length ? (
        <>
          <Text style={ui.seccion}>Practicá lo que aprendiste</Text>
          {actividades.map((e) => (
            <Tarjeta key={e.id} onPress={() => abrir(e)} estilo={{ flexDirection: 'row', alignItems: 'center', gap: espacio(3) }}>
              <Ionicons name={e.tipo === 'verdaderoFalso' ? 'git-compare-outline' : 'eye-outline'} size={22} color={color.acentoTexto} />
              <View style={{ flex: 1 }}>
                <Text style={st.actividad}>{e.titulo}</Text>
                <Text style={ui.suave}>{e.tipo === 'verdaderoFalso' ? 'Verdadero o falso' : '¿Qué hace el programa?'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.suave} />
            </Tarjeta>
          ))}
        </>
      ) : (
        <Text style={[ui.suave, { textAlign: 'center' }]}>Seguí con la próxima lección o pasá a Practicar.</Text>
      )}
    </View>
  );
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, k) => a + k);

const st = StyleSheet.create({
  arriba: { flexDirection: 'row', alignItems: 'center', gap: espacio(3), paddingHorizontal: espacio(4), paddingVertical: espacio(3) },
  titulo: { fontSize: 24, fontWeight: '800', color: color.texto, letterSpacing: -0.3 },
  pregunta: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  paso: { flexDirection: 'row', alignItems: 'center', gap: espacio(3), padding: espacio(2), borderRadius: radio.sm },
  pasoActivo: { backgroundColor: color.acentoSuave },
  pasoNro: { width: 26, height: 26, borderRadius: 13, backgroundColor: color.superficie, alignItems: 'center', justifyContent: 'center' },
  pasoNroTexto: { fontSize: 13, fontWeight: '800', color: color.texto },
  nota: { flexDirection: 'row', gap: espacio(3), backgroundColor: color.acentoSuave, borderRadius: radio.md, padding: espacio(4) },
  veredicto: { fontSize: 15, fontWeight: '800' },
  opcion: { flexDirection: 'row', alignItems: 'center', gap: espacio(3), backgroundColor: color.tarjeta, borderRadius: radio.md, padding: espacio(4), borderWidth: 1.5, borderColor: color.borde },
  opcionElegida: { borderColor: color.acento, backgroundColor: color.acentoSuave },
  opcionBien: { borderColor: color.bien, backgroundColor: color.bienFondo },
  opcionMal: { borderColor: color.mal, backgroundColor: color.malFondo },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: color.bordeControl, alignItems: 'center', justifyContent: 'center' },
  radioPunto: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.acento },
  festejo: { alignItems: 'center', gap: espacio(2), backgroundColor: color.tarjeta, borderRadius: radio.lg, padding: espacio(6) },
  actividad: { fontSize: 15, fontWeight: '700', color: color.texto },
});
