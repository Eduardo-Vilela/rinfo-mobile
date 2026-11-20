import { router, useLocalSearchParams } from 'expo-router';
import { EJERCICIOS } from 'rinfo-core';
import { NoEncontrado } from '../../components/NoEncontrado';
import { Pantalla } from '../../components/Pantalla';
import { QueHace } from '../../screens/QueHace';
import { VerdaderoFalso } from '../../screens/VerdaderoFalso';

/** Actividades de Aprender: ¿Qué hace? y verdadero o falso. */
export default function ActividadRuta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const e = EJERCICIOS.find((x) => x.id === id);
  const volver = () => router.back();
  if (e?.tipo === 'queHace') return <Pantalla><QueHace ejercicio={e} onVolver={volver} /></Pantalla>;
  if (e?.tipo === 'verdaderoFalso') return <Pantalla><VerdaderoFalso ejercicio={e} onVolver={volver} /></Pantalla>;
  return <NoEncontrado que="la actividad" />;
}
