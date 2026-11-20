import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { respuestasQueHace, type EjercicioQueHace } from 'rinfo-core';
import { Ciudad } from '../components/Ciudad';
import { mayuscula, BarraInferior, BarraProgreso, Boton, CodigoNumerado, Encabezado, Parrafo, s as ui, Tarjeta } from '../components/ui';
import { marcarResuelto } from '../storage';
import { color, espacio, mono, radio } from '../theme';

export function QueHace({ ejercicio, onVolver }: { ejercicio: EjercicioQueHace; onVolver: () => void }) {
  const { programa, respuestas } = useMemo(() => respuestasQueHace(ejercicio.programa, ejercicio.escenarios), [ejercicio]);
  const informa = ejercicio.programa.some((l) => l.includes('Informar'));
  const [i, setI] = useState(0);
  const [error, setError] = useState<boolean | null>(null);
  const [av, setAv] = useState('');
  const [ca, setCa] = useState('');
  const [inf, setInf] = useState('');
  const [comprobado, setComprobado] = useState(false);
  const [espio, setEspio] = useState(false);
  const [aciertos, setAciertos] = useState(0);
  const [linea, setLinea] = useState<number | undefined>();
  const fin = i >= respuestas.length;
  const actual = respuestas[Math.min(i, respuestas.length - 1)];
  const r = actual.resultado;

  const correcto = (() => {
    if (error === null || error !== !!r.error) return false;
    if (r.error) return true;
    if (Number(av) !== r.posicionFinal[0] || Number(ca) !== r.posicionFinal[1]) return false;
    if (informa && inf.trim().toUpperCase().replace(/[\s,]+/g, ' ') !== r.informes.join(' ')) return false;
    return true;
  })();

  function comprobar() {
    setComprobado(true);
    if (correcto && !espio) setAciertos((a) => a + 1);
  }
  function siguiente() {
    const n = i + 1;
    setI(n); setError(null); setAv(''); setCa(''); setInf(''); setComprobado(false); setEspio(false); setLinea(undefined);
    if (n >= respuestas.length && aciertos === respuestas.length) marcarResuelto(ejercicio.id);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Encabezado titulo={ejercicio.titulo} subtitulo="¿Qué hace el programa?" onVolver={onVolver} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: espacio(4), gap: espacio(4), paddingBottom: espacio(10) }}>
        <CodigoNumerado lineas={ejercicio.programa} resaltadas={linea ? [linea] : []} />
        {fin ? (
          <Tarjeta estilo={{ alignItems: 'center', gap: espacio(2), padding: espacio(6) }}>
            <Ionicons name={aciertos === respuestas.length ? 'trophy' : 'ribbon-outline'} size={36} color={color.acento} />
            <Text style={st.grande}>{aciertos} de {respuestas.length} correctas</Text>
            {ejercicio.notas ? <Parrafo texto={ejercicio.notas} estilo={{ textAlign: 'center' }} /> : null}
          </Tarjeta>
        ) : (
          <>
            <View style={{ gap: espacio(2) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={ui.seccion}>Situación {i + 1} de {respuestas.length}</Text>
              </View>
              <BarraProgreso valor={i / respuestas.length} />
              <Text style={st.grande}>{mayuscula(actual.nombre)}</Text>
            </View>

            <Ciudad
              key={i}
              programa={programa}
              escenario={actual.escenario}
              semilla={actual.semilla}
              bloqueada={!comprobado && !espio}
              onDesbloquear={() => setEspio(true)}
              onLinea={setLinea}
            />
            {espio && !comprobado ? <Text style={ui.suave}>Viste la ejecución antes de responder: esta situación no suma al progreso.</Text> : null}

            <Tarjeta estilo={{ gap: espacio(3) }}>
              <Text style={st.pregunta}>¿El programa termina con un error?</Text>
              <View style={{ flexDirection: 'row', gap: espacio(2) }}>
                {[false, true].map((v) => (
                  <Pressable key={String(v)} onPress={() => !comprobado && setError(v)} style={[st.opcion, error === v && st.opcionActiva]}>
                    <Text style={[st.opcionTexto, error === v && { color: color.acentoTexto }]}>{v ? 'Sí' : 'No'}</Text>
                  </Pressable>
                ))}
              </View>
              {error === false && (
                <>
                  <Text style={st.pregunta}>¿En qué esquina termina?</Text>
                  <View style={{ flexDirection: 'row', gap: espacio(2), alignItems: 'center' }}>
                    <Text style={st.paren}>(</Text>
                    <TextInput value={av} onChangeText={setAv} keyboardType="number-pad" placeholder="av" placeholderTextColor={color.suave} style={st.input} editable={!comprobado} />
                    <Text style={st.paren}>,</Text>
                    <TextInput value={ca} onChangeText={setCa} keyboardType="number-pad" placeholder="calle" placeholderTextColor={color.suave} style={st.input} editable={!comprobado} />
                    <Text style={st.paren}>)</Text>
                  </View>
                  {informa && (
                    <>
                      <Text style={st.pregunta}>¿Qué informa?</Text>
                      <TextInput value={inf} onChangeText={setInf} placeholder="Ej: 10" placeholderTextColor={color.suave} style={[st.input, { width: '100%' }]} editable={!comprobado} autoCapitalize="characters" />
                    </>
                  )}
                </>
              )}
            </Tarjeta>

            {comprobado && (
              <View style={[st.resultado, { backgroundColor: correcto ? color.bienFondo : color.malFondo }]}>
                <Ionicons name={correcto ? 'checkmark-circle' : 'information-circle'} size={22} color={correcto ? color.bien : color.mal} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[st.veredicto, { color: correcto ? color.bien : color.mal }]}>{correcto ? 'Correcto' : 'No es así'}</Text>
                  <Text style={ui.texto}>
                    {r.error
                      ? `Termina con error en la línea ${r.error.linea}: ${r.error.mensaje}`
                      : `Termina en (${r.posicionFinal.join(',')})${informa ? ` e informa ${r.informes.join(', ') || 'nada'}` : ''}.`}
                  </Text>
                  <Text style={ui.suave}>Reproducí la ejecución en el mapa para ver por qué.</Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
      <BarraInferior>
        {fin ? <Boton titulo="Listo" onPress={onVolver} />
          : comprobado ? <Boton titulo={i === respuestas.length - 1 ? 'Ver resultado' : 'Siguiente situación'} icono="arrow-forward" onPress={siguiente} />
          : <Boton titulo="Comprobar" onPress={comprobar} deshabilitado={error === null} />}
      </BarraInferior>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  grande: { fontSize: 17, fontWeight: '700', color: color.texto },
  pregunta: { fontSize: 15, fontWeight: '600', color: color.texto },
  opcion: { flex: 1, alignItems: 'center', paddingVertical: espacio(3), borderRadius: radio.md, borderWidth: 1.5, borderColor: color.borde, backgroundColor: color.tarjeta },
  opcionActiva: { backgroundColor: color.acentoSuave, borderColor: color.acento },
  opcionTexto: { fontSize: 15, fontWeight: '600', color: color.texto },
  paren: { fontSize: 18, color: color.suave, fontFamily: mono },
  input: { borderWidth: 1.5, borderColor: color.borde, backgroundColor: color.tarjeta, borderRadius: radio.sm, paddingHorizontal: espacio(3), paddingVertical: espacio(2), width: 76, fontFamily: mono, fontSize: 16, color: color.texto },
  resultado: { flexDirection: 'row', gap: espacio(3), padding: espacio(4), borderRadius: radio.md },
  veredicto: { fontSize: 15, fontWeight: '800' },
});
