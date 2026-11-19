import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { EJERCICIOS, type Correccion, type Ejercicio, type EjercicioPrograma } from 'rinfo-core';
import { Inicio, type Modulo } from './src/screens/Inicio';
import { Programa } from './src/screens/Programa';
import { QueHace } from './src/screens/QueHace';
import { VerdaderoFalso } from './src/screens/VerdaderoFalso';
import { Resultado } from './src/screens/Resultado';
import { marcarResuelto } from './src/storage';
import { color } from './src/theme';

type Pantalla =
  | { p: 'inicio' }
  | { p: 'queHace'; e: Extract<Ejercicio, { tipo: 'queHace' }> }
  | { p: 'vf'; e: Extract<Ejercicio, { tipo: 'verdaderoFalso' }> }
  | { p: 'programa'; cola: EjercicioPrograma[]; k: number; examen: boolean; intento: number }
  | { p: 'resultado'; cola: EjercicioPrograma[]; k: number; examen: boolean; correccion: Correccion; codigo: string };

const programas = () => EJERCICIOS.filter((e): e is EjercicioPrograma => e.tipo === 'programa');

export default function App() {
  const [modulo, setModulo] = useState<Modulo>('aprender');
  const [pantalla, setPantalla] = useState<Pantalla>({ p: 'inicio' });
  const inicio = () => setPantalla({ p: 'inicio' });

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pantalla.p === 'inicio') return false;
      inicio();
      return true;
    });
    return () => sub.remove();
  }, [pantalla.p]);

  function abrir(e: Ejercicio, m: Modulo) {
    if (e.tipo === 'queHace') setPantalla({ p: 'queHace', e });
    else if (e.tipo === 'verdaderoFalso') setPantalla({ p: 'vf', e });
    else setPantalla({ p: 'programa', cola: [e], k: 0, examen: m === 'examen', intento: 0 });
  }
  function simulacro() {
    // Un simulacro arma dos ejercicios al azar, priorizando los de tipo examen.
    const examen = programas().filter((e) => e.modulo === 'examen');
    const resto = programas().filter((e) => e.modulo !== 'examen' && e.dificultad >= 2);
    const azar = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);
    const lista = [...azar(examen).slice(0, 1), ...azar(resto).slice(0, 1)];
    setPantalla({ p: 'programa', cola: lista, k: 0, examen: true, intento: 0 });
  }

  let contenido;
  switch (pantalla.p) {
    case 'inicio':
      contenido = <Inicio modulo={modulo} setModulo={setModulo} abrir={abrir} simulacro={simulacro} />;
      break;
    case 'queHace':
      contenido = <QueHace ejercicio={pantalla.e} onVolver={inicio} />;
      break;
    case 'vf':
      contenido = <VerdaderoFalso ejercicio={pantalla.e} onVolver={inicio} />;
      break;
    case 'programa': {
      const { cola, k, examen, intento } = pantalla;
      contenido = (
        <Programa
          key={`${cola[k].id}-${intento}`}
          ejercicio={cola[k]}
          examen={examen}
          subtitulo={cola.length > 1 ? `Ejercicio ${k + 1} de ${cola.length}` : undefined}
          onVolver={inicio}
          onEntregar={(correccion, codigo) => {
            if (correccion.estado === 'corregido' && correccion.aprobado) marcarResuelto(cola[k].id);
            setPantalla({ p: 'resultado', cola, k, examen, correccion, codigo });
          }}
        />
      );
      break;
    }
    case 'resultado': {
      const { cola, k, examen, correccion, codigo } = pantalla;
      contenido = (
        <Resultado
          ejercicio={cola[k]}
          correccion={correccion}
          codigo={codigo}
          onVolver={inicio}
          onReintentar={() => setPantalla({ p: 'programa', cola, k, examen, intento: Date.now() })}
          siguiente={k + 1 < cola.length ? () => setPantalla({ p: 'programa', cola, k: k + 1, examen, intento: 0 }) : undefined}
        />
      );
      break;
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: color.fondo }} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        {contenido}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
