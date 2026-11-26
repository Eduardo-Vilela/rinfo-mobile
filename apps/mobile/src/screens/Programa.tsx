import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { compilar, corregir, type Correccion, type EjercicioPrograma, type Programa as TPrograma, type RInfoError } from 'rinfo-core';
import { Cargando } from '../components/Cargando';
import { Ciudad } from '../components/Ciudad';
import { BarraInferior, Boton, Chip, Encabezado, Parrafo, s as ui, Tarjeta } from '../components/ui';
import { guardarBorrador, leerBorrador } from '../storage';
import { color, espacio, mono, radio } from '../theme';

function formatoTiempo(seg: number) {
  const m = Math.floor(Math.abs(seg) / 60), s = Math.abs(seg) % 60;
  return `${seg < 0 ? '-' : ''}${m}:${String(s).padStart(2, '0')}`;
}

export function Programa({ ejercicio, examen, subtitulo, onVolver, onEntregar }: {
  ejercicio: EjercicioPrograma;
  examen: boolean;
  subtitulo?: string;
  onVolver: () => void;
  onEntregar: (c: Correccion, codigo: string) => void;
}) {
  const [codigo, setCodigo] = useState('');
  const [sel, setSel] = useState({ start: 0, end: 0 });
  const [forzarSel, setForzarSel] = useState<{ start: number; end: number } | undefined>();
  const [verEnunciado, setVerEnunciado] = useState(true);
  const [errores, setErrores] = useState<RInfoError[] | null>(null);
  const [probado, setProbado] = useState<TPrograma | undefined>();
  const [verMapa, setVerMapa] = useState(false);
  const [version, setVersion] = useState(0);
  const [corrigiendo, setCorrigiendo] = useState(false);
  const [restante, setRestante] = useState(ejercicio.tiempoSugeridoMin * 60);
  const cargado = useRef(false);
  const escenario = ejercicio.escenarios[0];
  // Cada escenario aleatorio se prueba en 3 ciudades distintas (ver SEMILLAS_POR_ESCENARIO en rinfo-core).
  const ciudades = ejercicio.escenarios.reduce((n, e) => n + (e.aleatorio ? 3 : 1), 0);

  // En práctica se recupera el borrador; en examen siempre se arranca con la hoja en blanco.
  useEffect(() => {
    if (examen) { cargado.current = true; return; }
    leerBorrador(ejercicio.id).then((b) => { if (b) setCodigo(b); cargado.current = true; });
  }, [ejercicio.id, examen]);
  useEffect(() => { if (cargado.current && !examen) guardarBorrador(ejercicio.id, codigo); }, [codigo, ejercicio.id, examen]);
  useEffect(() => {
    if (!examen) return;
    const t = setInterval(() => setRestante((r) => r - 1), 1000);
    return () => clearInterval(t);
  }, [examen]);

  const linea = codigo.slice(0, sel.start).split('\n').length;

  function tab() {
    const nuevo = codigo.slice(0, sel.start) + '  ' + codigo.slice(sel.end);
    const pos = sel.start + 2;
    setCodigo(nuevo);
    setForzarSel({ start: pos, end: pos });
    setTimeout(() => setForzarSel(undefined), 50);
  }
  /** Corregir es síncrono y en ejercicios largos tarda: se muestra el indicador y se corrige en el próximo cuadro. */
  function entregar() {
    setCorrigiendo(true);
    setTimeout(() => {
      const c = corregir(codigo, ejercicio);
      setCorrigiendo(false);
      onEntregar(c, codigo);
    }, 60);
  }
  function compilarYProbar() {
    const c = compilar(codigo);
    setErrores(c.errores);
    setProbado(c.programa);
    setVersion((v) => v + 1);
    if (c.programa) setVerMapa(true);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Encabezado
        titulo={subtitulo ?? ejercicio.titulo}
        subtitulo={examen ? 'Examen · una sola entrega' : 'Práctica'}
        onVolver={onVolver}
        derecha={examen ? (
          <View style={[st.reloj, restante < 0 && { backgroundColor: color.malFondo }]}>
            <Ionicons name="time-outline" size={16} color={restante < 0 ? color.mal : color.acentoTexto} />
            <Text style={[st.relojTexto, restante < 0 && { color: color.mal }]}>{formatoTiempo(restante)}</Text>
          </View>
        ) : null}
      />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: espacio(4), gap: espacio(3), paddingBottom: espacio(8) }}>
        <Tarjeta onPress={() => setVerEnunciado((v) => !v)} estilo={{ gap: espacio(2) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: espacio(2) }}>
            <Ionicons name="document-text-outline" size={18} color={color.acentoTexto} />
            <Text style={st.tarjetaTitulo}>Enunciado</Text>
            <Ionicons name={verEnunciado ? 'chevron-up' : 'chevron-down'} size={18} color={color.suave} style={{ marginLeft: 'auto' }} />
          </View>
          {verEnunciado ? <Parrafo texto={ejercicio.enunciado} /> : null}
        </Tarjeta>

        {!examen && escenario ? (
          <Tarjeta estilo={{ gap: espacio(3) }}>
            <Pressable onPress={() => setVerMapa((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: espacio(2) }}>
              <Ionicons name="map-outline" size={18} color={color.acentoTexto} />
              <Text style={st.tarjetaTitulo}>{probado ? 'Tu programa en la ciudad' : 'Ciudad de ejemplo'}</Text>
              <Ionicons name={verMapa ? 'chevron-up' : 'chevron-down'} size={18} color={color.suave} style={{ marginLeft: 'auto' }} />
            </Pressable>
            {verMapa ? (
              <>
                {!probado ? <Text style={ui.suave}>Así arranca una de las ciudades de prueba. Tocá Probar para ver tu programa moviéndose en ella.</Text> : null}
                <Ciudad key={version} escenario={escenario} semilla={1000} programa={probado} />
              </>
            ) : null}
          </Tarjeta>
        ) : null}

        <View style={st.editorCaja}>
          <View style={st.editorBarra}>
            <Chip texto={`Línea ${linea}`} icono="locate-outline" />
            <Text style={[ui.suave, { marginLeft: 'auto' }]}>Sangría: 2 espacios</Text>
          </View>
          <TextInput
            value={codigo}
            onChangeText={(t) => { setCodigo(t); setErrores(null); if (probado) { setProbado(undefined); setVersion((v) => v + 1); } }}
            onSelectionChange={(e) => setSel(e.nativeEvent.selection)}
            selection={forzarSel}
            multiline
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="off"
            importantForAutofill="no"
            textAlignVertical="top"
            placeholder={'programa NombreDelPrograma\nareas\n  …'}
            placeholderTextColor={color.suave}
            style={st.editor}
          />
        </View>

        {errores && (
          <View style={{ gap: espacio(2) }}>
            {errores.length === 0 ? (
              <View style={[st.aviso, { backgroundColor: color.bienFondo }]}>
                <Ionicons name="checkmark-circle" size={18} color={color.bien} />
                <Text style={[ui.texto, { color: color.bien, fontWeight: '700' }]}>Compila sin errores</Text>
              </View>
            ) : errores.map((e, i) => (
              <View key={i} style={[st.aviso, { backgroundColor: color.malFondo, alignItems: 'flex-start' }]}>
                <Text style={st.errorLinea}>L{e.linea}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={ui.texto}>{e.mensaje}</Text>
                  {e.sugerencia ? <Text style={ui.suave}>{e.sugerencia}</Text> : null}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <BarraInferior>
        <Pressable onPress={tab} style={st.tab} accessibilityLabel="Insertar dos espacios">
          <Text style={st.tabTexto}>⇥ Tab</Text>
        </Pressable>
        {!examen && <Boton titulo="Probar" icono="play" tipo="secundario" onPress={compilarYProbar} deshabilitado={!codigo.trim()} />}
        <Boton titulo="Entregar" icono="send" onPress={entregar} deshabilitado={!codigo.trim() || corrigiendo} />
      </BarraInferior>
      <Cargando visible={corrigiendo} mensaje="Corrigiendo tu programa" detalle={`Lo pruebo en ${ciudades} ${ciudades === 1 ? 'ciudad' : 'ciudades'}`} />
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  reloj: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.acentoSuave, paddingHorizontal: espacio(3), paddingVertical: 6, borderRadius: 999 },
  relojTexto: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'], color: color.acentoTexto },
  tarjetaTitulo: { fontSize: 15, fontWeight: '700', color: color.texto },
  editorCaja: { backgroundColor: color.tarjeta, borderRadius: radio.lg, borderWidth: 1.5, borderColor: color.borde, overflow: 'hidden' },
  editorBarra: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: espacio(3), paddingVertical: espacio(2), borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.borde },
  editor: { minHeight: 340, fontFamily: mono, fontSize: 14, lineHeight: 21, color: color.texto, padding: espacio(3) },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: espacio(3), padding: espacio(3), borderRadius: radio.sm },
  errorLinea: { fontFamily: mono, fontSize: 12, fontWeight: '800', color: '#FFFFFF', backgroundColor: color.mal, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  tab: { height: 48, paddingHorizontal: espacio(3), borderRadius: radio.md, borderWidth: 1.5, borderColor: color.bordeControl, justifyContent: 'center' },
  tabTexto: { fontFamily: mono, fontSize: 14, fontWeight: '700', color: color.texto },
});
