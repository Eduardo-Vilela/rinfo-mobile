import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { compilar, type Correccion, type EjercicioPrograma } from 'rinfo-core';
import { Ciudad } from '../components/Ciudad';
import { BarraInferior, Boton, CodigoNumerado, Encabezado, Parrafo, s as ui, Tarjeta } from '../components/ui';
import { color, espacio, mono, radio } from '../theme';

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
  const [linea, setLinea] = useState<number | undefined>();
  const programa = useMemo(() => (correccion.estado === 'corregido' ? compilar(codigo).programa : undefined), [codigo, correccion.estado]);
  const aprobado = correccion.estado === 'corregido' && correccion.aprobado;
  const lineasConError = correccion.estado === 'no-compila' ? correccion.errores.map((e) => e.linea) : [];
  const pasados = correccion.estado === 'corregido' ? correccion.escenarios.filter((e) => e.aprobado).length : 0;
  const titulo = correccion.estado === 'no-compila' ? 'No compila' : aprobado ? 'Aprobado' : 'Casi: revisá la lógica';
  const detalle = correccion.estado === 'no-compila'
    ? `${correccion.errores.length} error${correccion.errores.length === 1 ? '' : 'es'} de sintaxis`
    : `${pasados} de ${correccion.escenarios.length} ciudades bien${correccion.requisitos.length ? ' · faltan requisitos' : ''}`;

  return (
    <View style={{ flex: 1 }}>
      <Encabezado titulo={ejercicio.titulo} subtitulo="Corrección" onVolver={onVolver} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: espacio(4), gap: espacio(4), paddingBottom: espacio(10) }}>
        <View style={[st.estado, { backgroundColor: aprobado ? color.bien : color.mal }]}>
          <Ionicons name={aprobado ? 'checkmark-circle' : correccion.estado === 'no-compila' ? 'construct' : 'alert-circle'} size={34} color="#FFFFFF" />
          <View style={{ flex: 1 }}>
            <Text style={st.estadoTitulo}>{titulo}</Text>
            <Text style={st.estadoDetalle}>{detalle}</Text>
          </View>
        </View>

        {correccion.estado === 'no-compila' && (
          <View style={{ gap: espacio(2) }}>
            {correccion.errores.map((e, i) => (
              <Tarjeta key={i} estilo={{ flexDirection: 'row', gap: espacio(3), alignItems: 'flex-start' }}>
                <Text style={st.errorLinea}>L{e.linea}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={ui.texto}>{e.mensaje}</Text>
                  {e.sugerencia ? <Text style={ui.suave}>{e.sugerencia}</Text> : null}
                </View>
              </Tarjeta>
            ))}
          </View>
        )}

        {correccion.estado === 'corregido' && (
          <View style={{ gap: espacio(2) }}>
            {correccion.requisitos.map((r, i) => (
              <Tarjeta key={i} estilo={{ flexDirection: 'row', gap: espacio(3) }}>
                <Ionicons name="git-branch-outline" size={18} color={color.mal} />
                <Text style={[ui.texto, { flex: 1 }]}>{r}</Text>
              </Tarjeta>
            ))}
            <Text style={ui.seccion}>Ciudades probadas</Text>
            <Text style={ui.suave}>Tocá una para ver el recorrido de tu programa.</Text>
            {correccion.escenarios.map((esc, i) => (
              <Tarjeta key={i} estilo={{ gap: espacio(2) }}>
                <Pressable onPress={() => { setAbierto(abierto === i ? null : i); setLinea(undefined); }} style={{ flexDirection: 'row', alignItems: 'center', gap: espacio(2) }}>
                  <Ionicons name={esc.aprobado ? 'checkmark-circle' : 'close-circle'} size={20} color={esc.aprobado ? color.bien : color.mal} />
                  <Text style={[st.escenario, { flex: 1 }]}>{esc.nombre}</Text>
                  <Ionicons name={abierto === i ? 'chevron-up' : 'map-outline'} size={18} color={color.suave} />
                </Pressable>
                {esc.diferencias.map((d, k) => <Text key={k} style={ui.texto}>{d}</Text>)}
                {abierto === i && programa ? (
                  <View style={{ marginTop: espacio(2), gap: espacio(3) }}>
                    <Ciudad programa={programa} escenario={esc.escenario} semilla={esc.semilla} onLinea={setLinea} />
                  </View>
                ) : null}
              </Tarjeta>
            ))}
          </View>
        )}

        <Text style={ui.seccion}>Tu código</Text>
        <CodigoNumerado lineas={codigo.split('\n')} marcadas={lineasConError} resaltadas={linea ? [linea] : []} />

        {verSolucion ? (
          <>
            <Text style={ui.seccion}>Una solución posible</Text>
            <CodigoNumerado lineas={ejercicio.solucion} />
            {ejercicio.notas ? (
              <View style={st.nota}>
                <Ionicons name="information-circle-outline" size={18} color={color.acentoTexto} />
                <Parrafo texto={ejercicio.notas} estilo={{ flex: 1 }} />
              </View>
            ) : null}
          </>
        ) : (
          <Boton titulo="Ver una solución" icono="eye-outline" tipo="secundario" onPress={() => setVerSolucion(true)} />
        )}
      </ScrollView>
      <BarraInferior>
        <Boton titulo="Reintentar" icono="refresh" tipo="secundario" onPress={onReintentar} />
        {siguiente ? <Boton titulo="Siguiente" icono="arrow-forward" onPress={siguiente} /> : <Boton titulo="Listo" onPress={onVolver} />}
      </BarraInferior>
    </View>
  );
}

const st = StyleSheet.create({
  estado: { flexDirection: 'row', alignItems: 'center', gap: espacio(3), borderRadius: radio.lg, padding: espacio(5) },
  estadoTitulo: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  estadoDetalle: { fontSize: 14, color: '#FFFFFF', opacity: 0.9 },
  errorLinea: { fontFamily: mono, fontSize: 12, fontWeight: '800', color: '#FFFFFF', backgroundColor: color.mal, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  escenario: { fontSize: 15, fontWeight: '700', color: color.texto },
  nota: { flexDirection: 'row', gap: espacio(3), backgroundColor: color.acentoSuave, borderRadius: radio.md, padding: espacio(4) },
});
