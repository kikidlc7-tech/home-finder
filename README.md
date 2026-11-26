# Home Finder Exclusive

Residencias de lujo en la Costa Azul (Saint-Tropez → Mónaco) con **el precio en contexto**: cada propiedad muestra si su precio por m² está por debajo, en rango o por encima del promedio de las demás de su zona.

Proyecto del curso *Applied Algorithmic Thinking* (Assignments 1 → 2 → 3). Catálogo, precios y contactos son ilustrativos; las fotos son de Unsplash y no corresponden a los inmuebles.

- **Deploy:** https://home-finder-silk.vercel.app
- **Bitácora del Assignment 2:** [`PROMPT_LOG.md`](PROMPT_LOG.md)

## Qué puede hacer un usuario (funciones reales)

| Función | Dónde probarla | Qué la hace "real" |
|---|---|---|
| **Etiqueta de precio vs. zona** (A2) | Tarjetas, pines del mapa y sección "¿El precio es razonable?" de cada ficha | Calcula con los datos el precio/m² contra el promedio de las otras propiedades de su zona y tipo ([`js/price-tags.js`](js/price-tags.js)) |
| **Búsqueda con filtros y mapa** | `#buscar` | Filtra por zona, precio, recámaras, baños, tipo, etiqueta y amenidades; ordena; "Buscar mientras muevo el mapa" filtra por el área visible |
| **Precios en MXN / EUR / USD** | Selector de moneda del encabezado | Tipo de cambio en vivo de la API de Frankfurter (BCE), con caché de 12 h y respaldo |
| **Costo mensual estimado** | Ficha de casas y departamentos | Amortización con enganche, plazo y tasa ajustables + gastos de comunidad ([`js/finance.js`](js/finance.js)) |
| **Guardadas** | Corazón en tarjetas/ficha, `#guardadas` | Persisten en el navegador (localStorage) |
| **Contacto** | Ficha y formulario | Valida y abre WhatsApp con el mensaje armado (número de demo en `js/app.js` → `CONFIG`) |

## Cómo correrlo

Es un sitio estático, sin build ni dependencias:

```bash
python3 -m http.server 8000     # o cualquier servidor estático
# abre http://localhost:8000
node --test tests/*.test.js      # pruebas de la lógica
node tests/validacion.js 13      # etiqueta de una propiedad, para el registro de validación
node tests/benchmark.js          # O(n²) del A2 vs. O(n) actual
node tests/verificar-fotos.mjs   # revisa que las fotos de Unsplash respondan (requiere internet)
```

Deploy en Vercel: Framework **Other**, sin Build Command ni Output Directory. Los headers de seguridad están en [`vercel.json`](vercel.json).

## Estructura

```
index.html            vistas: #inicio (landing), #buscar, #guardadas, #propiedad-N (ficha)
css/styles.css        diseño (Instrument Serif + Geist; tinta mediterránea + azul marino)
js/price-tags.js      función del A2 (O(n)), sin dependencias, probada en node
js/finance.js         hipoteca y conversión de moneda
js/app.js             interfaz, rutas, filtros, mapa, ficha, formulario
data/propiedades.json catálogo (precios en EUR)
vendor/leaflet/       Leaflet 1.9.4 servido localmente (BSD-2)
tests/                pruebas, validación y benchmark
docs/                 revisión de 3 agentes, datos para el diagnóstico S22, guías
```

## Historial

| Tag / commit | Qué es |
|---|---|
| `assignment-1` | Mockup original (8 propiedades, filtros básicos, mapa ilustrado) |
| `assignment-2-v1` | Primera versión de las etiquetas de precio (campo `zona`, O(n²)) |
| commits posteriores | A3: algoritmo O(n), datos en JSON, rediseño completo, mapa real, CSP |

---

## Decisiones de diseño vs. sugerencias del IS

> **Alexis: esta sección la escribes tú.** La tarea pide al menos 2 entradas, y al menos 1 sobre **escalabilidad o seguridad**. La columna "Qué propuso el IS" ya está llenada con lo que la IA propuso de verdad; tú escribes **qué decidiste** (aceptar tal cual / rechazar / revisar) y **por qué** (motivo técnico o de criterio, citando algo concreto). Borra las entradas que no uses y no inventes decisiones que no tomaste: si rechazas algo, pide que se revierta y ese commit es tu mejor evidencia.

### 1. Algoritmo de etiquetas: de O(n²) a O(n) — *escalabilidad*
- **Qué propuso el IS:** reemplazar el filtro por propiedad (O(n²)) por sumas por grupo y "leave-one-out". Benchmark real en este repo (`node tests/benchmark.js`): 10,000 propiedades → 9,144 ms antes vs. 6.9 ms después; 20,000 → 37,334 ms vs. 11.8 ms. Prueba de equivalencia con la versión anterior en `tests/price-tags.test.js`.
- **Qué decidí:**
- **Por qué:**

### 2. Content-Security-Policy y escapar datos — *seguridad*
- **Qué propuso el IS:** el auditor 3 demostró que un título con `<img onerror>` ejecutaba código en la versión del A2 (innerHTML sin escapar). Se propuso escapar todo dato antes de insertarlo, quitar JS inline y añadir CSP en `vercel.json` (`script-src 'self'`). Verificado: con un título malicioso inyectado, `window.__xss` queda en 0.
- **Qué decidí:**
- **Por qué:**

### 3. Datos fuera del HTML (`data/propiedades.json`) — *escalabilidad*
- **Qué propuso el IS:** separar el catálogo del código. Medido: 30.7 KB (7.7 KB gzip) para 17 propiedades ≈ 455 B gzip por propiedad; con 10,000 serían ~4.5 MB que hoy se descargarían completos en cada visita → siguiente paso sería paginar desde una API.
- **Qué decidí:**
- **Por qué:**

### 4. Leaflet local en vez de CDN, cargado solo al abrir el mapa — *seguridad / rendimiento*
- **Qué propuso el IS:** servir Leaflet desde `vendor/` (sin depender de un CDN ni permitir scripts externos en la CSP) y cargarlo bajo demanda: 42 KB gzip que la landing no descarga.
- **Qué decidí:**
- **Por qué:**

### 5. La etiqueta usa el porcentaje redondeado — *caso límite de la función*
- **Qué propuso el IS:** el auditor 2 encontró que un ratio de 0.854 se mostraba "−15 %" pero decía "Precio en rango". Se cambió a clasificar con el mismo % que ve el usuario. Caso real: la villa #13 (Gassin) da −15.45 % → "Buena oportunidad (−15 %)".
- **Qué decidí:**
- **Por qué:**

### 6. Cambiar el catálogo a la Costa Azul en euros — *tu decisión de producto*
- **Qué propuso el IS:** al pedir casas de ~120 M MXN en la Costa Azul, el IS guardó precios en EUR (moneda de origen) y convierte a MXN/USD con tipo de cambio en vivo; propuso 2–4 propiedades por zona para que ninguna quede sin comparables. Limitación que señaló: con 2 o 3 comparables, una propiedad muy cara arrastra el promedio.
- **Qué decidí:**
- **Por qué:**

### 7. Versión "Azur" (renta y minimalismo) y regreso a Home Finder Exclusive — *tu decisión de producto*
- **Qué propuso el IS:** construyó la versión Azur que pediste (renta por temporada, un solo color, insignias como texto) y advirtió que quitar las etiquetas borraría tu función del A2 del deploy. Después pediste volver a esta versión; el IS la restauró y dejó Azur en el historial (commits `86ea26e`–`d721c4c`).
- **Qué decidí:**
- **Por qué:**

---

## Créditos
Fotos: [Unsplash](https://unsplash.com) (licencia Unsplash; autores en cada ficha). Mapa: Leaflet + © colaboradores de OpenStreetMap. Tipo de cambio: [Frankfurter](https://frankfurter.dev) (datos del BCE). Tipografías: Instrument Serif y Geist (Google Fonts).
