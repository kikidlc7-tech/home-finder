# Bitácora de prompts — Home Finder · Assignment 2

> Las secciones marcadas con ✍️ las escribes tú: la tarea pide que la especificación,
> los veredictos y el caso de prueba sean tuyos. Lo que está sin ✍️ es registro factual
> de lo que la IA propuso o construyó.

---

## Paso 1 — Especificación (Checkpoint A, S19)

**Función elegida:** Etiquetas automáticas de precio por propiedad.

✍️ **Qué hace:**
_(la acción exacta, en tus palabras)_

✍️ **Qué datos/inputs necesita:**
_(de dónde sale cada dato: ¿campo que ya existe? ¿campo nuevo? ¿algo que escribe el usuario?)_

✍️ **Cómo se sabrá que funciona:**
_(criterio verificable + al menos un caso de prueba concreto con su resultado esperado)_

✍️ **Auditado por:** _(nombre del compañero)_ · **Qué cuestionó y qué cambiaste:**

---

## Paso 2 — Construcción: propuestas de la IA y tus decisiones

**Prompt que diste:** «para home finder, realiza los siguientes cambios… [instrucciones del Assignment 2]» + «HAZLO»
(Herramienta: Claude)

Cada fila es una decisión de diseño que la IA tomó por su cuenta. Tu calificación depende de
que la cuestiones frente a TU especificación: acepta, rechaza o pide revisión, y di por qué.

| # | Propuesta de la IA | Campo de tu spec en juego | ✍️ Veredicto | ✍️ Razón (1-2 líneas) |
|---|---|---|---|---|
| 1 | **Fuente del "promedio de zona":** se agregó un campo nuevo `zona` (CDMX / Guadalajara / Querétaro) porque en el sitio original cada colonia tenía una sola propiedad y el promedio salía igual al precio propio. | Datos/inputs | | |
| 2 | **Leave-one-out:** cada propiedad se compara contra el promedio de las *otras* de su grupo, sin incluirse a sí misma. | Qué hace | | |
| 3 | **Terrenos aparte:** los terrenos usan `terreno` (m² de terreno) y solo se comparan contra terrenos; casas y deptos usan `m2` construidos y se comparan entre sí (casa y depto se mezclan). | Datos/inputs | | |
| 4 | **Umbrales:** ≤ 85 % del promedio → "Buena oportunidad"; ≥ 115 % → "Precio alto"; en medio → "Precio en rango". | Cómo se sabrá que funciona | | |
| 5 | **Sin comparables → sin etiqueta:** si no hay otra propiedad en el grupo, no se pone etiqueta y la ficha dice "Sin propiedades comparables en …". Hoy eso pasa con los 2 terrenos. | Qué hace | | |
| 6 | **Explicación en la ficha:** al abrir una propiedad se muestra el cálculo (precio/m², promedio, n.º de comparables, % de diferencia). Función extra no pedida. | Qué hace (alcance) | | |

⚠️ **Limitación que la IA señala:** hoy cada grupo tiene solo 1 comparable, así que en cada
zona una propiedad sale "oportunidad" y la otra "alto" casi por construcción. Opciones: aceptarlo
y documentarlo, agregar más propiedades, o usar un precio/m² de referencia externo (API / fuente pública).

---

## Paso 3 — Validación (antes de S20)

Cómo correrlo:
- **En el deploy:** abre el link, ubica la propiedad y ábrela (clic) para ver el cálculo.
- **En código:** `node test.js` en la carpeta del repo.

✍️ **Input exacto que usaste:**

✍️ **Output real (copiado y pegado, sin resumir):**
```

```

✍️ **Veredicto:** Aceptar / Rechazar / Revisar
✍️ **Razón (cita algo específico del output):**

_(Opcional: más casos de prueba)_

---

## Uso de IA

✍️ Herramienta(s): …
✍️ Para qué la usé: …
✍️ Qué decidí o verifiqué yo: …
