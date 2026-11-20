import { router, useLocalSearchParams } from 'expo-router';
import { LECCIONES } from 'rinfo-core';
import { Pantalla } from '../../components/Pantalla';
import { NoEncontrado } from '../../components/NoEncontrado';
import { Leccion } from '../../screens/Leccion';

export default function LeccionRuta() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const leccion = LECCIONES.find((l) => l.id === id);
  if (!leccion) return <NoEncontrado que="la lección" />;
  return (
    <Pantalla>
      <Leccion
        leccion={leccion}
        onVolver={() => router.back()}
        abrir={(e) => router.push({ pathname: '/actividad/[id]', params: { id: e.id } })}
      />
    </Pantalla>
  );
}
