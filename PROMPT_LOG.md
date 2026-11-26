# Bitácora de prompts — Home Finder · Assignment 2

> **Alexis:** las partes marcadas con ✍️ las escribes tú. La tarea dice que la especificación, los veredictos y el caso de prueba son tuyos, y eso es lo que te califican. Lo que no tiene ✍️ es el registro factual de lo que pediste y de lo que la IA propuso o hizo.

---

## Paso 1 — Especificación (Checkpoint A, S19)

**Función elegida:** etiquetas automáticas de precio por propiedad, según su precio por m² comparado con su zona.

✍️ **Qué hace:** _(la acción exacta, en tus palabras)_

✍️ **Qué datos/inputs necesita:** _(de dónde sale cada dato: `precio`, `m2`/`terreno`, `zona`, `tipo` de `data/propiedades.json`… ¿qué campo tuviste que agregar?)_

✍️ **Cómo se sabrá que funciona:** _(criterio verificable + al menos un caso concreto con el resultado esperado)_

✍️ **Auditado por:** _(compañero)_ · **Qué cuestionó y qué cambiaste:**

---

## Paso 2 — Construcción: lo que pediste, lo que la IA propuso y tu decisión

### Prompts que diste (registro)
1. «para home finder, realiza los siguientes cambios y dame los entregables…» + las instrucciones del Assignment 2 (19-nov).
2. «HAZLO» (19-nov) → primera versión de las etiquetas.
3. «ponle fotos de casas reales» (25-nov).
4. «mejora mi app 10,000 veces… actúa como 3 agentes… dame entregables A2 y A3…» (26-nov).
5. «diseño y flujos tipo Zillow… mapa con clic», «landing de marca, colores futuristas, ultra high-end», «casas de ~120 millones», «casas en la Costa Azul de Francia», «nombre Home Finder Exclusive» (26-nov).

### Propuestas de la IA para que decidas
Cada fila es algo que la IA decidió o cambió por su cuenta, o que tocó tu especificación. Escribe tu veredicto y tu razón (1–2 líneas, citando el campo de la spec en juego).

| # | Qué propuso o hizo la IA | Campo de tu spec en juego | ✍️ Veredicto | ✍️ Razón |
|---|---|---|---|---|
| 1 | **Campo nuevo `zona`**: en el sitio original cada colonia tenía una sola propiedad, así que su "promedio de zona" era ella misma. | Datos/inputs | | |
| 2 | **Leave-one-out**: cada propiedad se compara con el promedio de las *otras* de su grupo, no consigo misma. | Qué hace | | |
| 3 | **Terrenos aparte** (por m² de terreno); casas y departamentos juntos (por m² construido). | Datos/inputs | | |
| 4 | **Umbrales ±15 %** → "Buena oportunidad" / "Precio en rango" / "Precio alto". | Cómo se sabrá que funciona | | |
| 5 | **Sin comparables → sin etiqueta** y con motivo, en vez de inventar una. | Qué hace | | |
| 6 | **Error detectado por el auditor 2:** −14.6 % se mostraba como "−15 %" pero decía "Precio en rango". La IA propuso clasificar con el mismo % redondeado. | Cómo se sabrá que funciona | | |
| 7 | **Algoritmo O(n)** en lugar de O(n²): mismo resultado (hay prueba de equivalencia), 9.1 s → 6.9 ms con 10,000 propiedades. | Qué hace (no debería cambiar) | | |
| 8 | **Catálogo nuevo** (17 propiedades de la Costa Azul, precios en EUR, 2–4 por zona) a partir de tu pedido. Esto cambia los resultados de cualquier caso de prueba que hayas escrito con los datos viejos. | Datos/inputs | | |
| 9 | **Funciones extra no pedidas en tu spec:** mostrar los comparables en la ficha, barra de posición vs. promedio, filtro "Precio vs. zona", orden "Mejor precio vs. su zona". | Qué hace (alcance) | | |

⚠️ **Limitación que señala la IA:** con 1 a 3 comparables por zona, una sola propiedad muy cara mueve el promedio. Ejemplo real: en Saint-Tropez, la villa de €22 M (+70 %) hace que las otras dos salgan "Buena oportunidad". Tus opciones: aceptarlo y documentarlo, pedir un mínimo de comparables o usar la mediana. Cualquiera de las dos últimas cambia tu especificación.

---

## Paso 3 — Validación (antes de S20)

Cómo correrlo, ya con el deploy arriba:
- **En el deploy:** abre `https://TU-DEPLOY.vercel.app/#propiedad-13` y copia el texto de la sección "¿El precio es razonable?".
- **En código:** `node tests/validacion.js 13` (o el id que elijas) y copia la salida completa.

Caso límite sugerido (no obligatorio): la #13 (Gassin) queda justo en el umbral (−15.45 %).

✍️ **Input exacto que usaste:**

✍️ **Output real (copiado y pegado, sin resumir):**
```

```

✍️ **Veredicto:** Aceptar / Rechazar / Revisar
✍️ **Razón (cita algo específico del output):**

_(Opcional: más casos de prueba)_

---

## Uso de IA

✍️ Herramienta(s):
✍️ Para qué la usé:
✍️ Qué decidí o verifiqué yo:
