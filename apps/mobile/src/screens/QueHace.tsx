import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { respuestasQueHace, type EjercicioQueHace } from 'rinfo-core';
import { Boton, CodigoNumerado, Encabezado, s as ui } from '../components/ui';
import { Ciudad } from '../components/Ciudad';
import { marcarResuelto } from '../storage';
import { color, espacio, mono } from '../theme';

export function QueHace({ ejercicio, onVolver }: { ejercicio: EjercicioQueHace; onVolver: () => void }) {
  const { programa, respuestas } = useMemo(() => respuestasQueHace(ejercicio.programa, ejercicio.escenarios), [ejercicio]);
  const informa = ejercicio.programa.some((l) => l.includes('Informar'));
  const [i, setI] = useState(0);
  const [error, setError] = useState<boolean | null>(null);
  const [av, setAv] = useState('');
  const [ca, setCa] = useState('');
  const [inf, setInf] = useState('');
  const [comprobado, setComprobado] = useState(false);
  const [aciertos, setAciertos] = useState(0);
  const fin = i >= respuestas.length;
  const r = respuestas[Math.min(i, respuestas.length - 1)].resultado;

  const correcto = (() => {
    if (error === null) return false;
    if (error !== !!r.error) return false;
    if (r.error) return true;
    if (Number(av) !== r.posicionFinal[0] || Number(ca) !== r.posicionFinal[1]) return false;
    if (informa && inf.trim().replace(/\s+/g, ' ') !== r.informes.join(' ')) return false;
    return true;
  })();

  function comprobar() {
    setComprobado(true);
    if (correcto) setAciertos((a) => a + 1);
  }
  function siguiente() {
    const n = i + 1;
    setI(n); setError(null); setAv(''); setCa(''); setInf(''); setComprobado(false);
    if (n >= respuestas.length && aciertos === respuestas.length) marcarResuelto(ejercicio.id);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Encabezado titulo={ejercicio.titulo} onVolver={onVolver} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: espacio(4), gap: espacio(4), paddingBottom: espacio(12) }}>
        <CodigoNumerado lineas={ejercicio.programa} />
        {fin ? (
          <View style={ui.tarjeta}>
            <Text style={st.grande}>{aciertos} de {respuestas.length} correctas</Text>
            {ejercicio.notas ? <Text style={[ui.suave, { marginTop: espacio(2) }]}>{ejercicio.notas}</Text> : null}
          </View>
        ) : (
          <>
            <View style={{ gap: 4 }}>
              <Text style={ui.suave}>Situación {i + 1} de {respuestas.length}</Text>
              <Text style={st.grande}>{respuestas[i].nombre}</Text>
            </View>

            <Text style={ui.texto}>¿El programa termina con un error?</Text>
            <View style={{ flexDirection: 'row', gap: espacio(2) }}>
              {[false, true].map((v) => (
                <Pressable key={String(v)} onPress={() => !comprobado && setError(v)} style={[st.opcion, error === v && st.opcionActiva]}>
                  <Text style={[ui.texto, error === v && { color: color.fondo }]}>{v ? 'Sí' : 'No'}</Text>
                </Pressable>
              ))}
            </View>

            {error === false && (
              <>
                <Text style={ui.texto}>¿En qué esquina termina?</Text>
                <View style={{ flexDirection: 'row', gap: espacio(2), alignItems: 'center' }}>
                  <Text style={ui.texto}>(</Text>
                  <TextInput value={av} onChangeText={setAv} keyboardType="number-pad" placeholder="av" style={st.input} editable={!comprobado} />
                  <Text style={ui.texto}>,</Text>
                  <TextInput value={ca} onChangeText={setCa} keyboardType="number-pad" placeholder="calle" style={st.input} editable={!comprobado} />
                  <Text style={ui.texto}>)</Text>
                </View>
                {informa && (
                  <>
                    <Text style={ui.texto}>¿Qué informa?</Text>
                    <TextInput value={inf} onChangeText={setInf} placeholder="Ej: 10" style={[st.input, { width: '100%' }]} editable={!comprobado} autoCapitalize="characters" />
                  </>
                )}
              </>
            )}

            {comprobado && (
              <View style={[ui.tarjeta, { backgroundColor: correcto ? color.bienFondo : color.malFondo, gap: 4 }]}>
                <Text style={[st.grande, { color: correcto ? color.bien : color.mal }]}>{correcto ? 'Correcto' : 'No es así'}</Text>
                <Text style={ui.texto}>
                  {r.error
                    ? `Termina con error en la línea ${r.error.linea}: ${r.error.mensaje}`
                    : `Termina en (${r.posicionFinal.join(',')})${informa ? ` e informa ${r.informes.join(', ') || 'nada'}` : ''}.`}
                </Text>
              </View>
            )}
            {comprobado && (
              <Ciudad key={i} programa={programa} escenario={respuestas[i].escenario} semilla={respuestas[i].semilla} />
            )}
          </>
        )}
      </ScrollView>
      <View style={st.barra}>
        {fin ? <Boton titulo="Listo" onPress={onVolver} />
          : comprobado ? <Boton titulo="Siguiente" onPress={siguiente} />
          : <Boton titulo="Comprobar" onPress={comprobar} deshabilitado={error === null} />}
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  grande: { fontSize: 17, fontWeight: '600', color: color.texto },
  opcion: { flex: 1, alignItems: 'center', paddingVertical: espacio(3), borderRadius: 10, borderWidth: 1, borderColor: color.bordeControl },
  opcionActiva: { backgroundColor: color.texto, borderColor: color.texto },
  input: { borderWidth: 1, borderColor: color.bordeControl, borderRadius: 8, paddingHorizontal: espacio(3), paddingVertical: espacio(2), width: 72, fontFamily: mono, fontSize: 15, color: color.texto },
  barra: { flexDirection: 'row', padding: espacio(3), borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.borde },
});
