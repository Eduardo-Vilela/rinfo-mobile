import { Redirect, router } from 'expo-router';
import { EJERCICIOS, type EjercicioPrograma } from 'rinfo-core';
import { Pantalla } from '../components/Pantalla';
import { leerEntrega } from '../entrega';
import { Resultado } from '../screens/Resultado';

export default function ResultadoRuta() {
  const entrega = leerEntrega();
  const e = entrega && EJERCICIOS.find((x): x is EjercicioPrograma => x.id === entrega.cola[entrega.k] && x.tipo === 'programa');
  // Sin entrega en memoria (por ejemplo, al reabrir la app) no hay nada que mostrar.
  if (!entrega || !e) return <Redirect href="/" />;
  const { cola, k, examen } = entrega;
  const ir = (pos: number) =>
    router.replace({ pathname: '/ejercicio/[id]', params: { id: cola[pos], examen: examen ? '1' : '0', cola: cola.join(','), k: String(pos) } });
  return (
    <Pantalla>
      <Resultado
        ejercicio={e}
        correccion={entrega.correccion}
        codigo={entrega.codigo}
        onVolver={() => router.back()}
        onReintentar={() => ir(k)}
        siguiente={k + 1 < cola.length ? () => ir(k + 1) : undefined}
      />
    </Pantalla>
  );
}
