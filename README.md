# R-Info Mobile

App para practicar R-Info (Curso de Ingreso, Facultad de Informática UNLP) desde el celular. La idea es practicar como en el examen escrito: escribís el programa completo, sin autocompletado, y la app lo corrige con las reglas del material del curso.

- **Aprender**: 8 lecciones, una por capítulo del material (0 a 7). Cada una tiene conceptos breves, un ejemplo resuelto paso a paso (problema → pasos en castellano → código → ejecución en el mapa) y preguntas. Al final, actividades de "¿Qué hace?" y verdadero o falso con el mapa a la vista.
- **Practicar**: escribís el programa, compilás las veces que quieras y entregás.
- **Examen**: hoja en blanco, con temporizador y una sola entrega. También hay un simulacro con dos ejercicios al azar.

## Contenido

68 actividades de los capítulos 2 a 7 y de los ejercicios adicionales del Curso de Ingreso, incluidos los dos enunciados de examen de 2013. Falta cargar los ejercicios que dependen de una figura (recorridos de las figuras 5.9 a 5.11 y 6.5 a 6.7, y los adicionales 3 y 5).

El mapa de la ciudad aparece en todas las actividades: muestra la ciudad antes de ejecutar, reproduce el programa a velocidad lenta, normal o rápida y resalta en el código la línea que se está ejecutando. En Practicar podés probar tu programa en el mapa antes de entregar.

## Estructura

```
packages/rinfo-core   Intérprete de R-Info en TypeScript (sin dependencias)
  src/lexer.ts        Tokens, sangría de 2 columnas (INDENT/DEDENT), comentarios {…}
  src/parser.ts       AST y errores de sintaxis con línea y sugerencia
  src/checker.ts      Variables, tipos, parámetros E/ES, llamadas a procesos
  src/runtime.ts      Ejecución paso a paso (un generador por robot)
  src/scenario.ts     Ciudades de prueba fijas y al azar
  src/grader.ts       Corrige comparando contra la solución de referencia
  ejercicios/*.json   Ejercicios (formato en src/types.ts)
apps/mobile           App Expo (React Native)
```

## Desarrollo

```bash
pnpm install
pnpm test                 # tests del intérprete
pnpm start                # abre Expo; escaneá el QR con Expo Go
pnpm --filter mobile lint # ESLint con la configuración de Expo
```

## Obtener el APK

Cada push a `main` ejecuta el workflow **APK Android** en GitHub Actions. Cuando termina:

- El APK queda publicado en el release **"ultima"**. Abrilo desde el celular, descargá `rinfo.apk` e instalalo; Android te va a pedir permiso para instalar apps de origen desconocido.
- También queda como artefacto del workflow (`rinfo-apk`).

Para correrlo a mano: pestaña **Actions** → **APK Android** → **Run workflow**.

El APK está firmado con la clave de debug que genera Expo. Sirve para instalarlo en tu teléfono, no para publicarlo en Play Store.

## Agregar ejercicios

1. Creá un JSON en `packages/rinfo-core/ejercicios/` (podés copiar `cap3.json` como base).
2. Sumalo a la lista en `packages/rinfo-core/src/catalogo.ts`.
3. Corré `pnpm test`: comprueba que cada solución de referencia compile y pase sus propios escenarios.

Cada ejercicio de tipo `programa` se corrige ejecutando tu código y la `solucion` en las mismas ciudades, y comparando solo lo que se lista en `compararConReferencia` (`informa`, `posicionFinal`, `recorrido`, `ciudad`, `bolsa`). Para pedir modularización usá `"usa": { "procesosMin": 2 }`.

Los escenarios con `aleatorio` se prueban con 3 ciudades distintas. Con `restricciones` podés garantizar condiciones del enunciado, por ejemplo "seguro existen 20 flores": `{ "zona": [1,7,100,7], "totalFlores": { "min": 20 } }`.
