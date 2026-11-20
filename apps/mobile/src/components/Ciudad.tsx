import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Polyline, Rect, Text as SvgText } from 'react-native-svg';
import { Ciudad as Mapa, construirEscenario, Ejecucion, type Escenario, type Programa } from 'rinfo-core';
import { color, espacio, radio } from '../theme';
import { Boton, s as ui } from './ui';

const CELDA = 30;
const MARGEN = 26;
const MIN = 8;
const MAX = 11;

const VELOCIDADES = [
  { id: 'lenta', nombre: 'Lenta', ms: 750 },
  { id: 'normal', nombre: 'Normal', ms: 380 },
  { id: 'rapida', nombre: 'Rápida', ms: 50 },
] as const;

type Vista = { av0: number; ca0: number; nAv: number; nCa: number };

function crear(programa: Programa, escenario: Escenario, semilla: number) {
  const { ciudad, bolsa } = construirEscenario(escenario, semilla);
  return new Ejecucion(programa, ciudad, bolsa);
}

/** Recuadro que abarca las esquinas dadas, de MIN a MAX esquinas por lado, dentro de la ciudad. */
function encuadrar(xs: number[], ys: number[]): Vista {
  const ajustar = (vals: number[]) => {
    let a = Math.min(...vals);
    const b = Math.max(...vals);
    const n = Math.max(MIN, Math.min(MAX, b - a + 1));
    a = Math.max(1, Math.min(a - Math.floor((n - (b - a + 1)) / 2), 101 - n));
    return [a, n] as const;
  };
  const [av0, nAv] = ajustar(xs);
  const [ca0, nCa] = ajustar(ys);
  return { av0, ca0, nAv, nCa };
}
const contiene = (v: Vista, a: number, c: number) => a >= v.av0 && a < v.av0 + v.nAv && c >= v.ca0 && c < v.ca0 + v.nCa;

type Props = {
  escenario: Escenario;
  semilla?: number;
  /** Sin programa se muestra solo la ciudad inicial. */
  programa?: Programa;
  /** Muestra el estado inicial y pide un toque antes de dejar ver la ejecución. */
  bloqueada?: boolean;
  onDesbloquear?: () => void;
  /** Línea del programa que se acaba de ejecutar (para resaltarla en el código). */
  onLinea?: (linea: number | undefined) => void;
};

/** Lo que se dibuja en un momento de la ejecución (copia, para no leer el intérprete durante el render). */
type Foto = {
  ciudad: Mapa;
  robot?: { av: number; ca: number; dir: number; flores: number; papeles: number; recorrido: [number, number][] };
  informes: string[];
  error?: { linea: number; mensaje: string };
  terminado: boolean;
  paso: number;
};
function fotografiar(e: Ejecucion, paso: number): Foto {
  const r = e.robots[0];
  return {
    ciudad: e.ciudad.clonar(),
    robot: r ? { av: r.av, ca: r.ca, dir: r.dir, flores: r.bolsa.flores, papeles: r.bolsa.papeles, recorrido: [...r.recorrido] } : undefined,
    informes: [...e.informes],
    error: e.error,
    terminado: e.terminado,
    paso,
  };
}

/** El componente se reinicia al cambiar su `key`: quien lo usa cambia la key cuando cambia el programa o la ciudad. */
export function Ciudad({ escenario, semilla = 1, programa, bloqueada, onDesbloquear, onLinea }: Props) {
  const inicial = useMemo(() => construirEscenario(escenario, semilla), [escenario, semilla]);
  const completo = useMemo(() => (programa ? crear(programa, escenario, semilla).ejecutarTodo() : undefined), [programa, escenario, semilla]);
  const total = completo?.pasos ?? 0;
  const ejec = useRef<Ejecucion | undefined>(undefined);
  const [foto, setFoto] = useState<Foto | undefined>(() => (programa ? fotografiar(crear(programa, escenario, semilla), 0) : undefined));
  const [jugando, setJugando] = useState(false);
  const [vel, setVel] = useState<(typeof VELOCIDADES)[number]['id']>('normal');

  function motor(): Ejecucion | undefined {
    if (!ejec.current && programa) ejec.current = crear(programa, escenario, semilla);
    return ejec.current;
  }
  function reiniciar() {
    ejec.current = programa ? crear(programa, escenario, semilla) : undefined;
    setFoto(ejec.current ? fotografiar(ejec.current, 0) : undefined);
    setJugando(false);
    onLinea?.(undefined);
  }

  // Encuadre: el recorrido completo más las esquinas con algo cerca; si no entra, la vista sigue al robot.
  const fijo = useMemo(() => {
    const puntos: [number, number][] = completo ? [...completo.recorrido] : [[1, 1]];
    const v0 = encuadrar(puntos.map((p) => p[0]), puntos.map((p) => p[1]));
    if (!puntos.every(([a, c]) => contiene(v0, a, c))) return null;
    const cerca = inicial.ciudad.snapshot().filter(([a, c]) => Math.abs(a - v0.av0) < MAX && Math.abs(c - v0.ca0) < MAX && a >= v0.av0 - 2 && c >= v0.ca0 - 2);
    const v1 = encuadrar([...puntos.map((p) => p[0]), ...cerca.map((p) => p[0])], [...puntos.map((p) => p[1]), ...cerca.map((p) => p[1])]);
    return puntos.every(([a, c]) => contiene(v1, a, c)) ? v1 : v0;
  }, [completo, inicial]);

  function avanzar(n: number) {
    const e = motor();
    if (!e) return;
    let k = 0;
    let ultima: number | undefined;
    while (k < n) {
      const p = e.paso();
      if (!p) break;
      ultima = p.linea;
      k++;
    }
    if (ultima !== undefined) onLinea?.(ultima);
    setFoto((f) => fotografiar(e, (f?.paso ?? 0) + k));
    if (e.terminado) setJugando(false);
  }
  useEffect(() => {
    if (!jugando) return;
    const v = VELOCIDADES.find((x) => x.id === vel)!;
    const porTic = v.id === 'rapida' ? Math.max(1, Math.ceil(total / 160)) : 1;
    const t = setInterval(() => avanzar(porTic), v.ms);
    return () => clearInterval(t);
  });

  const activo = !!foto && !bloqueada;
  const r = activo ? foto!.robot : undefined;
  const paso = foto?.paso ?? 0;
  const ciudad: Mapa = activo ? foto!.ciudad : inicial.ciudad;
  const robotAv = r?.av ?? 1, robotCa = r?.ca ?? 1, dir = r?.dir ?? 0;
  const camino = r?.recorrido ?? [];
  const vista = fijo ?? encuadrar([robotAv], [robotCa]);
  const { av0, ca0, nAv, nCa } = vista;
  const x = (av: number) => MARGEN + (av - av0) * CELDA + CELDA / 2;
  const y = (ca: number) => (nCa - 1 - (ca - ca0)) * CELDA + CELDA / 2;
  const ancho = MARGEN + nAv * CELDA, alto = nCa * CELDA + 18;

  const esquinas: { a: number; c: number; f: number; p: number }[] = [];
  for (let a = av0; a < av0 + nAv; a++)
    for (let c = ca0; c < ca0 + nCa; c++) {
      const k = ciudad.get(a, c);
      if (k.flores || k.papeles) esquinas.push({ a, c, f: k.flores, p: k.papeles });
    }

  const robot = contiene(vista, robotAv, robotCa) ? (() => {
    const cx = x(robotAv), cy = y(robotCa), ang = (dir * Math.PI) / 2;
    return [[0, -10], [-8, 8], [8, 8]].map(([px, py]) => `${cx + px * Math.cos(ang) - py * Math.sin(ang)},${cy + px * Math.sin(ang) + py * Math.cos(ang)}`).join(' ');
  })() : null;

  const terminado = !!foto?.terminado;
  return (
    <View style={{ gap: espacio(3) }}>
      <View style={st.mapa}>
        <Svg width="100%" height={alto} viewBox={`0 0 ${ancho} ${alto}`}>
          {Array.from({ length: nAv }, (_, i) => (
            <Line key={`va${i}`} x1={x(av0 + i)} x2={x(av0 + i)} y1={y(ca0 + nCa - 1)} y2={y(ca0)} stroke={color.grilla} strokeWidth={1} />
          ))}
          {Array.from({ length: nCa }, (_, i) => (
            <Line key={`hc${i}`} x1={x(av0)} x2={x(av0 + nAv - 1)} y1={y(ca0 + i)} y2={y(ca0 + i)} stroke={color.grilla} strokeWidth={1} />
          ))}
          {Array.from({ length: nAv }, (_, i) => (
            <SvgText fontFamily="system-ui, Roboto, sans-serif" key={`a${i}`} x={x(av0 + i)} y={nCa * CELDA + 12} fontSize={10} fill={color.suave} textAnchor="middle">{av0 + i}</SvgText>
          ))}
          {Array.from({ length: nCa }, (_, i) => (
            <SvgText fontFamily="system-ui, Roboto, sans-serif" key={`c${i}`} x={11} y={y(ca0 + i) + 4} fontSize={10} fill={color.suave} textAnchor="middle">{ca0 + i}</SvgText>
          ))}
          {camino.length > 1 ? (
            <Polyline points={camino.filter(([a, c]) => contiene(vista, a, c)).map(([a, c]) => `${x(a)},${y(c)}`).join(' ')}
              fill="none" stroke={color.acento} strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
          {esquinas.map(({ a, c, f, p }) => <Objetos key={`${a}-${c}`} cx={x(a)} cy={y(c)} f={f} p={p} />)}
          {robot ? <Polygon points={robot} fill={color.texto} stroke="#FFFFFF" strokeWidth={1.5} /> : null}
        </Svg>
      </View>

      {bloqueada ? <Boton titulo="Ver la ejecución" icono="eye-outline" tipo="secundario" onPress={() => onDesbloquear?.()} /> : null}

      <View style={st.leyenda}>
        <View style={st.item}><View style={st.puntoFlor} /><Text style={ui.suave}>flor</Text></View>
        <View style={st.item}><View style={st.puntoPapel} /><Text style={ui.suave}>papel</Text></View>
        <View style={st.item}><Ionicons name="navigate" size={12} color={color.texto} /><Text style={ui.suave}>robot</Text></View>
        {activo ? <Text style={[ui.suave, { marginLeft: 'auto' }]}>Paso {paso} de {total}</Text> : null}
      </View>

      {activo ? (
        <>
          {r ? (
            <Text style={ui.suave}>
              En ({r.av},{r.ca}) · bolsa: {r.flores} {r.flores === 1 ? 'flor' : 'flores'}, {r.papeles} {r.papeles === 1 ? 'papel' : 'papeles'}
              {foto!.informes.length ? `  ·  informó: ${foto!.informes.join(', ')}` : ''}
            </Text>
          ) : null}
          {foto!.error && terminado ? (
            <View style={st.error}>
              <Ionicons name="alert-circle" size={16} color={color.mal} />
              <Text style={[ui.texto, { color: color.mal, flex: 1 }]}>Línea {foto!.error.linea}: {foto!.error.mensaje}</Text>
            </View>
          ) : null}
          <View style={st.velocidades}>
            {VELOCIDADES.map((v) => (
              <Pressable key={v.id} onPress={() => setVel(v.id)} style={[st.vel, vel === v.id && st.velActiva]}>
                <Text style={[st.velTexto, vel === v.id && { color: color.acentoTexto }]}>{v.nombre}</Text>
              </Pressable>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: espacio(2) }}>
            <Boton titulo="" icono="refresh" tipo="secundario" onPress={reiniciar} estilo={{ flex: 0, width: 52 }} />
            <Boton titulo="Paso" icono="play-skip-forward" tipo="secundario" onPress={() => { setJugando(false); avanzar(1); }} deshabilitado={terminado} />
            <Boton titulo={jugando ? 'Pausa' : paso === 0 ? 'Reproducir' : 'Seguir'} icono={jugando ? 'pause' : 'play'} onPress={() => setJugando((j) => !j)} deshabilitado={terminado} />
          </View>
        </>
      ) : null}
    </View>
  );
}

/** Flor (círculo) y papel (cuadrado) de una esquina, con la cantidad si hay más de uno. */
function Objetos({ cx, cy, f, p }: { cx: number; cy: number; f: number; p: number }) {
  const ambos = f > 0 && p > 0;
  const fx = ambos ? cx - 5 : cx, px = ambos ? cx + 5 : cx;
  const etiqueta = [f ? String(f) : '', p ? String(p) : ''].filter(Boolean).join('·');
  return (
    <>
      {f > 0 ? <Circle cx={fx} cy={cy} r={6} fill={color.flor} stroke="#FFFFFF" strokeWidth={1.5} /> : null}
      {p > 0 ? <Rect x={px - 5.5} y={cy - 5.5} width={11} height={11} rx={2} fill={color.papel} stroke="#FFFFFF" strokeWidth={1.5} /> : null}
      {f > 1 || p > 1 ? <SvgText fontFamily="system-ui, Roboto, sans-serif" x={cx + 9} y={cy - 7} fontSize={9} fontWeight="700" fill={color.texto}>{etiqueta}</SvgText> : null}
    </>
  );
}

const st = StyleSheet.create({
  mapa: { backgroundColor: color.tarjeta, borderRadius: radio.md, borderWidth: 1, borderColor: color.borde, paddingVertical: espacio(2), overflow: 'hidden' },
  leyenda: { flexDirection: 'row', alignItems: 'center', gap: espacio(4) },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  puntoFlor: { width: 10, height: 10, borderRadius: 5, backgroundColor: color.flor },
  puntoPapel: { width: 10, height: 10, borderRadius: 2, backgroundColor: color.papel },
  error: { flexDirection: 'row', gap: espacio(2), backgroundColor: color.malFondo, padding: espacio(3), borderRadius: radio.sm },
  velocidades: { flexDirection: 'row', backgroundColor: color.superficie, borderRadius: radio.sm, padding: 3 },
  vel: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8 },
  velActiva: { backgroundColor: color.tarjeta },
  velTexto: { fontSize: 13, fontWeight: '600', color: color.suave },
});
