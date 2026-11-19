import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { compilar, corregir, type Correccion, type EjercicioPrograma, type RInfoError } from 'rinfo-core';
import { Boton, Encabezado, s as ui } from '../components/ui';
import { guardarBorrador, leerBorrador } from '../storage';
import { color, espacio, mono } from '../theme';

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
  const [restante, setRestante] = useState(ejercicio.tiempoSugeridoMin * 60);
  const cargado = useRef(false);

  // En práctica se recupera el borrador; en examen siempre se arranca con la hoja en blanco.
  useEffect(() => {
    if (examen) { cargado.current = true; return; }
    leerBorrador(ejercicio.id).then((b) => { if (b) setCodigo(b); cargado.current = true; });
  }, [ejercicio.id, examen]);
  useEffect(() => { if (cargado.current && !examen) guardarBorrador(ejercicio.id, codigo); }, [codigo]);
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

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Encabezado
        titulo={subtitulo ?? ejercicio.titulo}
        onVolver={onVolver}
        derecha={examen ? <Text style={[st.reloj, restante < 0 && { color: color.mal }]}>{formatoTiempo(restante)}</Text> : null}
      />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: espacio(4), gap: espacio(3), paddingBottom: espacio(8) }}>
        <Pressable onPress={() => setVerEnunciado((v) => !v)} style={ui.tarjeta}>
          {verEnunciado ? (
            <>
              <Text style={ui.texto}>{ejercicio.enunciado}</Text>
              <Text style={[ui.suave, { marginTop: espacio(2) }]}>Tocá para ocultar</Text>
            </>
          ) : (
            <Text style={ui.suave}>Ver enunciado</Text>
          )}
        </Pressable>
        <TextInput
          value={codigo}
          onChangeText={(t) => { setCodigo(t); setErrores(null); }}
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
        {errores && (
          <View style={{ gap: espacio(2) }}>
            {errores.length === 0 ? (
              <Text style={[ui.texto, { color: color.bien }]}>Compila sin errores.</Text>
            ) : errores.map((e, i) => (
              <View key={i} style={st.error}>
                <Text style={st.errorLinea}>Línea {e.linea}</Text>
                <Text style={ui.texto}>{e.mensaje}</Text>
                {e.sugerencia ? <Text style={ui.suave}>{e.sugerencia}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <View style={st.barra}>
        <Text style={[ui.suave, { width: 64 }]}>Línea {linea}</Text>
        <Pressable onPress={tab} style={st.tab}><Text style={st.tabTexto}>Tab</Text></Pressable>
        {!examen && <Boton titulo="Compilar" tipo="secundario" onPress={() => setErrores(compilar(codigo).errores)} />}
        <Boton titulo="Entregar" onPress={() => onEntregar(corregir(codigo, ejercicio), codigo)} deshabilitado={!codigo.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  reloj: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'], color: color.texto },
  editor: {
    minHeight: 320, fontFamily: mono, fontSize: 13, lineHeight: 20, color: color.texto,
    borderWidth: 1, borderColor: color.borde, borderRadius: 12, padding: espacio(3),
  },
  error: { backgroundColor: color.malFondo, borderRadius: 10, padding: espacio(3), gap: 2 },
  errorLinea: { fontSize: 12, fontWeight: '700', color: color.mal },
  barra: {
    flexDirection: 'row', alignItems: 'center', gap: espacio(2), padding: espacio(3),
    borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.borde, backgroundColor: color.fondo,
  },
  tab: { paddingVertical: espacio(3), paddingHorizontal: espacio(4), borderRadius: 10, borderWidth: 1, borderColor: color.borde },
  tabTexto: { fontFamily: mono, fontSize: 14, color: color.texto },
});
