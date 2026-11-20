import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { EJERCICIOS, type Correccion, type Ejercicio, type EjercicioPrograma, type Leccion as TLeccion } from 'rinfo-core';
import { Inicio, type Modulo } from './src/screens/Inicio';
import { Leccion } from './src/screens/Leccion';
import { Programa } from './src/screens/Programa';
import { QueHace } from './src/screens/QueHace';
import { Resultado } from './src/screens/Resultado';
import { VerdaderoFalso } from './src/screens/VerdaderoFalso';
import { marcarResuelto } from './src/storage';
import { color } from './src/theme';

type Pantalla =
  | { p: 'inicio' }
  | { p: 'leccion'; l: TLeccion; alFinal?: boolean }
  | { p: 'queHace'; e: Extract<Ejercicio, { tipo: 'queHace' }>; desde?: TLeccion }
  | { p: 'vf'; e: Extract<Ejercicio, { tipo: 'verdaderoFalso' }>; desde?: TLeccion }
  | { p: 'programa'; cola: EjercicioPrograma[]; k: number; examen: boolean; intento: number }
  | { p: 'resultado'; cola: EjercicioPrograma[]; k: number; examen: boolean; correccion: Correccion; codigo: string };

const programas = () => EJERCICIOS.filter((e): e is EjercicioPrograma => e.tipo === 'programa');
const azar = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);

export default function App() {
  const [modulo, setModulo] = useState<Modulo>('aprender');
  const [pantalla, setPantalla] = useState<Pantalla>({ p: 'inicio' });
  const inicio = () => setPantalla({ p: 'inicio' });
  // Las actividades abiertas desde una lección vuelven a esa lección.
  const volver = () => {
    if ((pantalla.p === 'queHace' || pantalla.p === 'vf') && pantalla.desde) setPantalla({ p: 'leccion', l: pantalla.desde, alFinal: true });
    else inicio();
  };

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pantalla.p === 'inicio') return false;
      volver();
      return true;
    });
    return () => sub.remove();
  }, [pantalla]);

  function abrir(e: Ejercicio, m: Modulo, desde?: TLeccion) {
    if (e.tipo === 'queHace') setPantalla({ p: 'queHace', e, desde });
    else if (e.tipo === 'verdaderoFalso') setPantalla({ p: 'vf', e, desde });
    else setPantalla({ p: 'programa', cola: [e], k: 0, examen: m === 'examen', intento: 0 });
  }
  function simulacro() {
    // Un ejercicio de tipo examen y otro de práctica de nivel 2 o más.
    const examen = programas().filter((e) => e.modulo === 'examen');
    const resto = programas().filter((e) => e.modulo !== 'examen' && e.dificultad >= 2);
    setPantalla({ p: 'programa', cola: [...azar(examen).slice(0, 1), ...azar(resto).slice(0, 1)], k: 0, examen: true, intento: 0 });
  }

  let contenido;
  switch (pantalla.p) {
    case 'inicio':
      contenido = <Inicio modulo={modulo} setModulo={setModulo} abrir={abrir} abrirLeccion={(l) => setPantalla({ p: 'leccion', l })} simulacro={simulacro} />;
      break;
    case 'leccion':
      contenido = <Leccion key={pantalla.l.id} leccion={pantalla.l} alFinal={pantalla.alFinal} onVolver={inicio} abrir={(e) => abrir(e, 'aprender', pantalla.l)} />;
      break;
    case 'queHace':
      contenido = <QueHace key={pantalla.e.id} ejercicio={pantalla.e} onVolver={volver} />;
      break;
    case 'vf':
      contenido = <VerdaderoFalso key={pantalla.e.id} ejercicio={pantalla.e} onVolver={volver} />;
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
