import { router, useLocalSearchParams } from 'expo-router';
import { EJERCICIOS, type EjercicioPrograma } from 'rinfo-core';
import { NoEncontrado } from '../../components/NoEncontrado';
import { Pantalla } from '../../components/Pantalla';
import { guardarEntrega } from '../../entrega';
import { Programa } from '../../screens/Programa';
import { marcarResuelto } from '../../storage';

/**
 * Un ejercicio para escribir. Parámetros: `examen` ('1' = modo examen) y, en un simulacro,
 * `cola` (ids separados por coma) y `k` (posición dentro de la cola).
 */
export default function EjercicioRuta() {
  const { id, examen, cola, k } = useLocalSearchParams<{ id: string; examen?: string; cola?: string; k?: string }>();
  const e = EJERCICIOS.find((x): x is EjercicioPrograma => x.id === id && x.tipo === 'programa');
  if (!e) return <NoEncontrado que="el ejercicio" />;
  const lista = cola ? cola.split(',') : [e.id];
  const pos = Number(k ?? 0);
  return (
    <Pantalla>
      <Programa
        key={e.id}
        ejercicio={e}
        examen={examen === '1'}
        subtitulo={lista.length > 1 ? `Ejercicio ${pos + 1} de ${lista.length}` : undefined}
        onVolver={() => router.back()}
        onEntregar={(correccion, codigo) => {
          if (correccion.estado === 'corregido' && correccion.aprobado) marcarResuelto(e.id);
          guardarEntrega({ cola: lista, k: pos, examen: examen === '1', codigo, correccion });
          router.replace('/resultado');
        }}
      />
    </Pantalla>
  );
}
