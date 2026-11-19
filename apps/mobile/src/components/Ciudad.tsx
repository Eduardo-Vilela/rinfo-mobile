import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { construirEscenario, Ejecucion, type Escenario, type Programa } from 'rinfo-core';
import { color, espacio } from '../theme';
import { Boton, s as ui } from './ui';

const CELDA = 30;
const MARGEN = 28;
const MIN = 8;
const MAX = 12;

type Vista = { av0: number; ca0: number; nAv: number; nCa: number };

function crear(programa: Programa, escenario: Escenario, semilla: number) {
  const { ciudad, bolsa } = construirEscenario(escenario, semilla);
  return new Ejecucion(programa, ciudad, bolsa);
}

/** Recuadro que abarca el recorrido, de MIN a MAX esquinas por lado, dentro de la ciudad. */
function encuadrar(xs: number[], ys: number[]): Vista {
  const ajustar = (vals: number[]) => {
    let a = Math.min(...vals), b = Math.max(...vals);
    let n = Math.max(MIN, Math.min(MAX, b - a + 1));
    a = Math.max(1, Math.min(a - Math.floor((n - (b - a + 1)) / 2), 101 - n));
    return [a, n] as const;
  };
  const [av0, nAv] = ajustar(xs);
  const [ca0, nCa] = ajustar(ys);
  return { av0, ca0, nAv, nCa };
}

/** Vista de la ciudad con el recorrido del robot, reproducible paso a paso. */
export function Ciudad({ programa, escenario, semilla }: { programa: Programa; escenario: Escenario; semilla: number }) {
  const completo = useMemo(() => crear(programa, escenario, semilla).ejecutarTodo(), [programa, escenario, semilla]);
  const total = completo.pasos;
  // Encuadre fijo si todo el recorrido entra; si no, la vista sigue al robot.
  const fijo = useMemo(() => {
    const v = encuadrar(completo.recorrido.map((p) => p[0]), completo.recorrido.map((p) => p[1]));
    const cabe = completo.recorrido.every(([a, c]) => a >= v.av0 && a < v.av0 + v.nAv && c >= v.ca0 && c < v.ca0 + v.nCa);
    return cabe ? v : null;
  }, [completo]);
  const ejec = useRef(crear(programa, escenario, semilla));
  const [paso, setPaso] = useState(0);
  const [jugando, setJugando] = useState(false);

  function reiniciar() {
    ejec.current = crear(programa, escenario, semilla);
    setPaso(0);
    setJugando(false);
  }
  function avanzar(n: number) {
    let k = 0;
    while (k < n && ejec.current.paso()) k++;
    setPaso((p) => p + k);
    if (ejec.current.terminado) setJugando(false);
  }
  useEffect(() => {
    if (!jugando) return;
    const porTic = Math.max(1, Math.ceil(total / 150));
    const t = setInterval(() => avanzar(porTic), 60);
    return () => clearInterval(t);
  }, [jugando, total]);

  const e = ejec.current;
  const r = e.robots[0];
  const camino = r?.recorrido ?? [];
  const vista = fijo ?? encuadrar([r?.av ?? 1], [r?.ca ?? 1]);

  const { av0, ca0, nAv, nCa } = vista;
  const x = (av: number) => MARGEN + (av - av0) * CELDA + CELDA / 2;
  const y = (ca: number) => (nCa - 1 - (ca - ca0)) * CELDA + CELDA / 2;
  const ancho = MARGEN + nAv * CELDA, alto = nCa * CELDA + 20;
  const dentro = ([a, c]: number[]) => a >= av0 && a < av0 + nAv && c >= ca0 && c < ca0 + nCa;

  const esquinas: { a: number; c: number; f: number; p: number }[] = [];
  for (let a = av0; a < av0 + nAv; a++)
    for (let c = ca0; c < ca0 + nCa; c++) {
      const k = e.ciudad.get(a, c);
      esquinas.push({ a, c, f: k.flores, p: k.papeles });
    }

  const robot = r && dentro([r.av, r.ca]) ? (() => {
    const cx = x(r.av), cy = y(r.ca);
    // Triángulo que apunta hacia donde mira: 0 norte, 1 este, 2 sur, 3 oeste.
    const pts = [[0, -9], [-7, 7], [7, 7]];
    const ang = (r.dir * Math.PI) / 2;
    return pts.map(([px, py]) => `${cx + px * Math.cos(ang) - py * Math.sin(ang)},${cy + px * Math.sin(ang) + py * Math.cos(ang)}`).join(' ');
  })() : null;

  return (
    <View style={{ gap: espacio(2) }}>
      <View style={{ borderWidth: 1, borderColor: color.borde, borderRadius: 12, overflow: 'hidden', alignItems: 'center', paddingVertical: espacio(2) }}>
        <Svg width="100%" height={alto} viewBox={`0 0 ${ancho} ${alto}`}>
          {Array.from({ length: nAv }, (_, i) => (
            <SvgText key={`a${i}`} x={x(av0 + i)} y={nCa * CELDA + 14} fontSize={10} fill={color.suave} textAnchor="middle">{av0 + i}</SvgText>
          ))}
          {Array.from({ length: nCa }, (_, i) => (
            <SvgText key={`c${i}`} x={12} y={y(ca0 + i) + 4} fontSize={10} fill={color.suave} textAnchor="middle">{ca0 + i}</SvgText>
          ))}
          {esquinas.map(({ a, c }) => <Circle key={`p${a}-${c}`} cx={x(a)} cy={y(c)} r={1.8} fill={color.bordeControl} />)}
          <Polyline
            points={camino.filter(dentro).map(([a, c]) => `${x(a)},${y(c)}`).join(' ')}
            fill="none" stroke={color.acento} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          />
          {esquinas.filter((k) => k.f > 0).map(({ a, c, f }) => (
            <Circle key={`f${a}-${c}`} cx={x(a)} cy={y(c) - 5} r={5} fill={color.flor} />
          ))}
          {esquinas.filter((k) => k.p > 0).map(({ a, c }) => (
            <Rect key={`q${a}-${c}`} x={x(a) - 4} y={y(c) + 1} width={8} height={8} fill={color.papel} />
          ))}
          {esquinas.filter((k) => k.f > 1 || k.p > 1).map(({ a, c, f, p }) => (
            <SvgText key={`n${a}-${c}`} x={x(a) + 8} y={y(c) - 6} fontSize={9} fill={color.suave}>{[f > 1 ? f : '', p > 1 ? p : ''].filter(Boolean).join('/')}</SvgText>
          ))}
          {robot ? <Polygon points={robot} fill={color.texto} /> : null}
        </Svg>
      </View>
      <Text style={ui.suave}>
        Paso {paso} de {total}{r ? `  ·  (${r.av},${r.ca})` : ''}{r ? `  ·  bolsa: ${r.bolsa.flores} flores, ${r.bolsa.papeles} papeles` : ''}
      </Text>
      {e.error && e.terminado ? <Text style={[ui.texto, { color: color.mal }]}>Línea {e.error.linea}: {e.error.mensaje}</Text> : null}
      <View style={{ flexDirection: 'row', gap: espacio(2) }}>
        <Boton titulo="Reiniciar" tipo="secundario" onPress={reiniciar} />
        <Boton titulo="Paso" tipo="secundario" onPress={() => avanzar(1)} deshabilitado={e.terminado} />
        <Boton titulo={jugando ? 'Pausa' : 'Reproducir'} onPress={() => setJugando((j) => !j)} deshabilitado={e.terminado} />
      </View>
      <Text style={ui.suave}>● flor   ■ papel   ▲ robot</Text>
    </View>
  );
}
