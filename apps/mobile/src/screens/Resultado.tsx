import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { compilar, type Correccion, type EjercicioPrograma } from 'rinfo-core';
import { Ciudad } from '../components/Ciudad';
import { Boton, CodigoNumerado, Encabezado, s as ui } from '../components/ui';
import { color, espacio } from '../theme';

export function Resultado({ ejercicio, correccion, codigo, onVolver, onReintentar, siguiente }: {
  ejercicio: EjercicioPrograma;
  correccion: Correccion;
  codigo: string;
  onVolver: () => void;
  onReintentar: () => void;
  siguiente?: () => void;
}) {
  const [verSolucion, setVerSolucion] = useState(false);
  const [abierto, setAbierto] = useState<number | null>(null);
  const programa = useMemo(() => (correccion.estado === 'corregido' ? compilar(codigo).programa : undefined), [codigo, correccion.estado]);
  const aprobado = correccion.estado === 'corregido' && correccion.aprobado;
  const lineasConError = correccion.estado === 'no-compila' ? correccion.errores.map((e) => e.linea) : [];
  const resumen =
    correccion.estado === 'no-compila'
      ? `${correccion.errores.length} error${correccion.errores.length === 1 ? '' : 'es'} de sintaxis`
      : aprobado ? 'Aprobado' : 'Compila, pero no resuelve el problema';

  return (
    <View style={{ flex: 1 }}>
      <Encabezado titulo={ejercicio.titulo} onVolver={onVolver} />
      <ScrollView contentContainerStyle={{ padding: espacio(4), gap: espacio(4), paddingBottom: espacio(12) }}>
        <View style={[st.estado, { backgroundColor: aprobado ? color.bienFondo : color.malFondo }]}>
          <Text style={[st.estadoTexto, { color: aprobado ? color.bien : color.mal }]}>{resumen}</Text>
        </View>

        {correccion.estado === 'no-compila' && correccion.errores.map((e, i) => (
          <View key={i} style={st.item}>
            <Text style={st.itemLinea}>Línea {e.linea}</Text>
            <Text style={ui.texto}>{e.mensaje}</Text>
            {e.sugerencia ? <Text style={ui.suave}>{e.sugerencia}</Text> : null}
          </View>
        ))}

        {correccion.estado === 'corregido' && (
          <View style={{ gap: espacio(2) }}>
            {correccion.requisitos.map((r, i) => (
              <View key={i} style={st.item}><Text style={ui.texto}>{r}</Text></View>
            ))}
            <Text style={ui.suave}>Tocá una ciudad para ver el recorrido de tu programa.</Text>
            {correccion.escenarios.map((esc, i) => (
              <Pressable key={i} style={st.item} onPress={() => setAbierto(abierto === i ? null : i)}>
                <Text style={[st.itemLinea, { color: esc.aprobado ? color.bien : color.mal }]}>
                  {esc.aprobado ? '✓' : '✗'}  {esc.nombre}
                </Text>
                {esc.diferencias.map((d, k) => <Text key={k} style={ui.texto}>{d}</Text>)}
                {abierto === i && programa ? (
                  <View style={{ marginTop: espacio(2) }}>
                    <Ciudad programa={programa} escenario={esc.escenario} semilla={esc.semilla} />
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        )}

        <Text style={st.subtitulo}>Tu código</Text>
        <CodigoNumerado lineas={codigo.split('\n')} marcadas={lineasConError} />

        {verSolucion ? (
          <>
            <Text style={st.subtitulo}>Una solución posible</Text>
            <CodigoNumerado lineas={ejercicio.solucion} />
            {ejercicio.notas ? <Text style={ui.suave}>{ejercicio.notas}</Text> : null}
          </>
        ) : (
          <Boton titulo="Ver una solución" tipo="secundario" onPress={() => setVerSolucion(true)} />
        )}
      </ScrollView>
      <View style={st.barra}>
        <Boton titulo="Volver a intentar" tipo="secundario" onPress={onReintentar} />
        {siguiente ? <Boton titulo="Siguiente" onPress={siguiente} /> : <Boton titulo="Listo" onPress={onVolver} />}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  estado: { borderRadius: 12, padding: espacio(4) },
  estadoTexto: { fontSize: 18, fontWeight: '700' },
  item: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.borde, paddingVertical: espacio(3), gap: 4 },
  itemLinea: { fontSize: 13, fontWeight: '700', color: color.mal },
  subtitulo: { fontSize: 13, fontWeight: '600', color: color.suave, textTransform: 'uppercase', letterSpacing: 0.5 },
  barra: { flexDirection: 'row', gap: espacio(2), padding: espacio(3), borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.borde },
});
