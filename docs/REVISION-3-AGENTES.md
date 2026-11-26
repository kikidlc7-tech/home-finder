# Revisión de 3 agentes (26-nov-2026) y qué se hizo con cada hallazgo

Tres agentes de IA auditaron por separado la versión del Assignment 2 (tag `assignment-2-v1`), sin ver el rediseño. Los reportes completos están en [`docs/revision/`](revision/) (las rutas de capturas que citan eran del entorno de trabajo y no se incluyen).

| Auditor | Calificación de la versión A2 |
|---|---|
| 1. Diseño visual / UI | 6/10 |
| 2. Flujos, UX y producto | 4/10 |
| 3. Adaptabilidad, accesibilidad, seguridad y escalabilidad | adaptabilidad 6 · accesibilidad 4 · rendimiento 8 · seguridad 5 · escalabilidad 4 |

## Hallazgos principales → estado en la versión actual

| Hallazgo (P0/P1) | Auditor | Estado | Cómo se verificó |
|---|---|---|---|
| Menú ☰ de móvil sin listener: no había navegación | 1, 2, 3 | Corregido | e2e: "menú móvil abre" en 390 px |
| La ficha no era un diálogo: el foco se iba atrás, no se cerraba con Escape | 2, 3 | Corregido (role=dialog, foco atrapado, Esc, foco devuelto) | e2e: 60 Tab siguen dentro; Esc cierra |
| No se podía compartir ni volver a una propiedad | 2 | Corregido: URL `#propiedad-N`, botón copiar enlace, Guardadas persistentes | e2e: abrir por URL directa; guardadas tras recargar |
| XSS con `innerHTML` sin escapar | 3 | Corregido + CSP | prueba con título malicioso: no se ejecuta |
| Sin CSP ni headers | 3 | Corregido en `vercel.json` | e2e completo corre con la CSP aplicada |
| O(n²) en las etiquetas | 3 | Corregido (O(n)) | `tests/benchmark.js`, prueba de equivalencia |
| −14.6 % mostrado como −15 % pero "en rango" | 2 | Corregido | `tests/price-tags.test.js` |
| Zona con mayúsculas/acentos distintos = grupos separados | 2 | Corregido | prueba "Èze = eze" |
| Filtro "Más de $8 M" mostraba todo; faltaba "Hasta $6 M" | 2, 3 | Rediseñado: precio mínimo y máximo | e2e: precio ≤ €5 M |
| Búsqueda no reconocía palabras sin acento | 2 | Corregido | e2e: "eze" encuentra Èze |
| Cifras de confianza inventadas ("+120 familias", "4.9") | 1, 2 | Eliminadas; las cifras salen de los datos | revisión visual |
| Misma ilustración para todas las propiedades | 1, 2 | 90 fotos reales (Unsplash) con respaldo si una falla | `tests/verificar-fotos.mjs` |
| Modo oscuro ilegible | 1, 3 | Se fijó el modo claro (`color-scheme: light`); la landing ya tiene secciones oscuras propias | — |
| Contrastes < 4.5:1 | 1, 3 | Paleta nueva verificada (texto de marca 6.2:1, botones 5.4:1) | cálculo WCAG |
| "1 propiedades encontradas" | 2 | Corregido | e2e |
| Formulario aceptaba nombre de espacios y no confirmaba nada | 2, 3 | Validación + mensaje que dice qué pasó | e2e |
| Etiqueta con 1 comparable que mezcla casa con departamento | 1, 2, 3 | **Pendiente de tu decisión** (cambia tu especificación) | PROMPT_LOG fila 9 y limitación |
