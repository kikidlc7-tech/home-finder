# Guía para tu autoevaluación (Assignment 3)

> **Esto no es tu autoevaluación.** La tarea pide que la escribas tú: 10–15 líneas sobre en cuál de los 4 LOs creciste más, con evidencia concreta y verificable de tu proyecto. Esta guía solo te ordena los hechos para que los encuentres rápido. Al final agrega tu sección **"Uso de IA"** (no cuenta en las 15 líneas).

## Los 4 LOs
- **#Accountability:** aceptar, rechazar o revisar lo que propone la IA, con motivos.
- **#Organization:** claridad del README y de tu comunicación escrita.
- **#AlgorithmicStrategies:** descomponer el problema (especificación de 3 campos) y diagnosticar la restricción real (S22).
- **#ComputationalTools:** terminología correcta de datos/inputs, API externa verificada contra su documentación.

## Línea de tiempo verificable de tu proyecto (hechos, no opiniones)
| Fecha | Qué pasó | Dónde se verifica |
|---|---|---|
| 15-sep | Mockup del A1: 8 propiedades, mapa ilustrado | tag `assignment-1` |
| 19-nov | Se detecta que cada colonia tenía 1 sola propiedad → campo `zona` | commit `Agrega etiquetas automáticas…`, PROMPT_LOG fila 1 |
| 26-nov | 3 auditorías independientes: UX 4/10, diseño 6/10; XSS demostrado; O(n²) medido | `docs/revision/` |
| 26-nov | Caso límite −14.6 % mostrado como −15 % pero "en rango" → corregido | commit `Etiquetas de precio en O(n)…`, prueba en `tests/` |
| 26-nov | Pediste cambiar el catálogo a la Costa Azul (~120 M MXN) | commit `Datos fuera del código…` |
| 26-nov | CSP en `vercel.json`, datos escapados | commit `Seguridad: …` |

## Preguntas para elegir tu momento
1. ¿Hubo algo que la IA te propuso y **tú** cambiaste o rechazaste? ¿Por qué? (Si todavía no, las filas del PROMPT_LOG y del README son tu oportunidad.)
2. ¿Qué número de tu propio proyecto te hizo cambiar de opinión sobre algo?
3. Entre el A1 y hoy, ¿qué haces distinto al pedirle algo a una IA?
