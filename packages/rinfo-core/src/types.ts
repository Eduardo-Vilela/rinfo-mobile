// Formato de los ejercicios de R-Info Mobile (versión 1).
// Cada archivo cap*.json es un ArchivoEjercicios.

export type Esquina = [avenida: number, calle: number];
export type Zona = [av1: number, ca1: number, av2: number, ca2: number];
export type Rango = [min: number, max: number];

export type ArchivoEjercicios = {
  capitulo: string;
  version: 1;
  ejercicios: Ejercicio[];
};

export type Ejercicio = EjercicioPrograma | EjercicioQueHace | EjercicioVerdaderoFalso;

type Base = {
  id: string; // único, ej. "c2-08"
  modulo: 'aprender' | 'practicar' | 'examen';
  titulo: string;
  tema: 'secuencia' | 'seleccion' | 'repeticion' | 'iteracion' | 'variables' | 'procesos' | 'parametrosE' | 'parametrosES';
  dificultad: 1 | 2 | 3;
  enunciado: string;
  escenarios: Escenario[];
  notas?: string; // aclaraciones para el alumno o para quien carga el ejercicio
};

// El alumno escribe el programa completo.
export type EjercicioPrograma = Base & {
  tipo: 'programa';
  tiempoSugeridoMin: number;
  validaciones: {
    // El grader ejecuta la solución de referencia y la del alumno en cada
    // escenario (con la misma semilla) y compara solo lo que se lista acá.
    compararConReferencia: Observable[];
    usa?: {
      procesosMin?: number;            // "SE DEBE USAR MODULARIZACIÓN"
      parametros?: ('E' | 'ES')[];     // exige al menos un parámetro de cada clase
      prohibido?: string[];            // ej. ["Pos"] para obligar a recorrer
    };
  };
  solucion: string[]; // una línea por elemento; sangría de 2 columnas
};

// El alumno lee un programa y responde qué pasa en cada escenario.
// Las respuestas correctas las calcula el grader ejecutando `programa`.
export type EjercicioQueHace = Base & {
  tipo: 'queHace';
  programa: string[];
  preguntas: ('posicionFinal' | 'informa' | 'error')[];
};

// Afirmaciones sobre un programa: el alumno marca V o F y lee la justificación.
export type EjercicioVerdaderoFalso = Omit<Base, 'escenarios'> & {
  tipo: 'verdaderoFalso';
  programa: string[];
  afirmaciones: { texto: string; respuesta: boolean; justificacion: string }[];
  // Ciudades de ejemplo para explorar el programa en el mapa antes de responder.
  ejemplos?: Escenario[];
};

// ---------- Lecciones del módulo Aprender ----------

export type Leccion = {
  id: string;           // "l0" … "l7"
  capitulo: number;     // capítulo del material
  titulo: string;
  resumen: string;
  minutos: number;
  secciones: Seccion[];
  actividades: string[]; // ids de ejercicios ¿Qué hace? / V-F para practicar al final
};

export type Seccion =
  | { tipo: 'concepto'; titulo: string; texto: string[]; codigo?: string[] }
  | {
      tipo: 'ejemplo';
      titulo: string;
      problema: string;
      // El problema resuelto primero en castellano; cada paso apunta a las líneas que lo implementan.
      pasos: { texto: string; lineas: [desde: number, hasta: number] }[];
      programa: string[];
      escenario: Escenario;
      cierre?: string;
    }
  | {
      tipo: 'pregunta';
      pregunta: string;
      programa?: string[];
      escenario?: Escenario; // si está, se muestra el mapa para deducir la respuesta
      opciones: string[];
      correcta: number;
      explicacion: string;
    };

export type Observable =
  | 'informa'        // secuencia de valores mostrados con Informar
  | 'posicionFinal'  // esquina donde termina el robot
  | 'recorrido'      // esquinas visitadas, en orden
  | 'ciudad'         // flores y papeles de todas las esquinas al terminar
  | 'bolsa';         // flores y papeles en la bolsa al terminar

// Un escenario fijo, uno aleatorio, o ambos (lo fijo se aplica después).
// Si no se indica nada, la ciudad está vacía y la bolsa también.
export type Escenario = {
  nombre?: string;
  flores?: [avenida: number, calle: number, cantidad: number][];
  papeles?: [avenida: number, calle: number, cantidad: number][];
  bolsa?: { flores?: number; papeles?: number };
  aleatorio?: {
    zona: Zona;
    flores?: Rango;   // cantidad por esquina dentro de la zona
    papeles?: Rango;
    // Probabilidad de que una esquina tenga flores / papeles (por defecto 1: todas).
    densidad?: { flores?: number; papeles?: number };
    bolsa?: { flores?: Rango; papeles?: Rango };
    // El generador reintenta hasta cumplir todas (muestreo con rechazo).
    restricciones?: Restriccion[];
  };
};

export type Restriccion = {
  zona: Zona;
  totalFlores?: { min?: number; max?: number };
  totalPapeles?: { min?: number; max?: number };
  esquinasSinPapel?: { min?: number; max?: number };
  esquinasSinFlor?: { min?: number; max?: number };
  esquinasVacias?: { min?: number };  // sin flores ni papeles
};
