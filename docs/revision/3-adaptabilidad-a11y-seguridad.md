# Home Finder — Auditoría de adaptabilidad, accesibilidad, rendimiento, seguridad y escalabilidad

Fecha: 2026-11-26 · Revisé `review-snapshot/index.html` (49,097 B, 1,075 líneas) y `review-snapshot/price-tags.js` (2,641 B).
Lo medí con Playwright + Chrome (`file://`, sin red; las fuentes externas se bloquearon) y con Node 22. No modifiqué el código: las pruebas de XSS y de escala se hicieron sobre copias en `reviews/work/copy/`. Los scripts que reproducen todo están en `reviews/work/` (`audit.py`, `extra.py`, `bench.js`, `contrast.js`).

## Resumen

1. Es un sitio ligero (13.3 KB gzip, cero imágenes y sin dependencias JS) y no tiene desborde horizontal en ninguno de los 5 anchos. Pero **el menú móvil no hace nada** y **la ficha (modal) no gestiona el foco**.
2. El modo oscuro deja **ilegible el panel del mapa** (contraste de 1.09 a 2.03). El filtro "Más de $8,000,000" devuelve resultados incorrectos. Todo el render usa `innerHTML` sin escapar: es un XSS latente, que ejecuté en una copia.
3. `calcularEtiquetasPrecio` es O(n²): tarda 0.56 ms con 100 propiedades, 4.97 s con 10,000 y **129 s con 50,000**. Una versión O(n) equivalente tarda 22 ms con 50,000. Renderizar todas las tarjetas a la vez no escala más allá de ~1,000.

| Subárea | Calificación |
|---|---|
| Adaptabilidad | 6/10 |
| Accesibilidad | 4/10 |
| Rendimiento | 8/10 (con los datos actuales) |
| Seguridad | 5/10 |
| Escalabilidad | 4/10 |

---

## Hallazgos priorizados

### P0 — Rompe algo

**1. El botón de menú móvil (`#menuToggle`) no tiene ningún manejador; la navegación desaparece en ≤860 px**
- Evidencia: el CSS (líneas 545–546) oculta `.nav-links` y muestra `.menu-toggle` en ≤860 px, pero el JS nunca registra un listener sobre `#menuToggle` (no aparece en las líneas 805–1073). Medido en 360, 390 y 768 px: después de hacer clic, `.nav-links` sigue con `visible=false`, `aria-expanded=null` y el `<header>` queda idéntico. Capturas: `shots/a11y-360-menu-after-click.png` y `a11y-390-menu-after-click.png`. En 768 px (tablet) también se pierde la navegación.
- Impacto: en móvil y tablet no hay forma de saltar a Nosotros, Ubicaciones o Contacto. El botón tiene nombre accesible ("Abrir menú") y promete algo que no hace.
- Propuesta: agregar `aria-controls="navLinks" aria-expanded="false"` al botón y `id="navLinks"` al `<ul>`. En el JS, alternar una clase `.open` en `.nav-links` y actualizar `aria-expanded` y `aria-label` ("Cerrar menú"). Cerrar el menú al hacer clic en un enlace y con Escape. En CSS: `@media (max-width:860px){ .nav-links.open{display:flex; flex-direction:column; position:absolute; inset:100% 0 auto; background:var(--paper); padding:16px 20px; border-bottom:1px solid var(--line)} .nav-links.open a{display:block; padding:12px 0} }`. Alternativa sin JS: `<details>`/`<summary>`.

**2. La ficha (modal) no es un diálogo: el foco se queda detrás, Tab recorre la página oculta y al cerrarla con el botón el foco se pierde**
- Evidencia (teclado a 1440 px): se enfoca la tarjeta 1 y se pulsa Enter. `document.activeElement` sigue siendo el `ARTICLE` de la tarjeta (`inModal=false`). Las siguientes 8 pulsaciones de Tab van a 7 tarjetas y a un pin del mapa que están **detrás** del modal (`inModal=false` en todas). La página de fondo se desplaza mientras el modal tapa la vista (captura `shots/a11y-kbd-modal-tab.png`). `#modalCard` no tiene `role`, `aria-modal` ni `aria-labelledby` (líneas 799–801). Tras cerrar con `#modalCloseBtn`, el foco cae en `BODY`. Escape sí cierra (línea 1005).
- Impacto: quien navega con teclado o lector de pantalla no puede leer la ficha ni usar sus botones (WhatsApp y Maps) sin recorrer toda la página. El lector no anuncia que se abrió un diálogo. Incumple WCAG 2.4.3 (orden del foco) y 4.1.2.
- Propuesta: usar `<dialog id="modal">` nativo con `showModal()`. Así se obtienen gratis la captura del foco, el fondo inerte, Escape y `::backdrop`. Poner `aria-labelledby` apuntando al `h2` de la ficha. Al abrir, `modalCloseBtn.focus()`. Al cerrar, guardar `lastTrigger = document.activeElement` antes de abrir y luego hacer `lastTrigger.focus()`. Si se conserva el `div`, hay que agregar `role="dialog" aria-modal="true"`, aplicar `inert` a `header, main, footer, .fab-wa` mientras está abierto y devolver el foco.

**3. En modo oscuro, el panel "Ubicaciones" queda ilegible**
- Evidencia: `.map-panel{background:var(--green-deep)}` (línea 370) tiene texto con color fijo claro (`#F1ECE1` y `#CBDAD3`, líneas 371–380). En oscuro, `--green-deep` cambia a `#7BB3A0` (línea 35). Medido con `color_scheme=dark`: fondo `rgb(123,179,160)`. Contrastes: h2 **2.03:1**, párrafo **1.65:1**, leyenda **1.11:1**, eyebrow dorado **1.09:1**. Captura: `shots/a11y-dark-map.png`.
- Impacto: la sección no se puede leer para cualquier usuario con el sistema en modo oscuro, que es el comportamiento predeterminado de muchos móviles.
- Propuesta: no usar un token que se invierte como fondo de un bloque con texto de color fijo. Crear `--map-bg:#1F4038` igual en ambos temas, o `.map-panel{background:#1F4038}`. Con `#F1ECE1` sobre `#1F4038` el contraste es 9.64:1.

**4. El filtro "Más de $8,000,000" muestra todas las propiedades (que cuestan menos de 8 M)**
- Evidencia: la opción `value="999999999"` (línea 677) pasa por `p.precio <= precioMax` (línea 922). Al elegirla, el contador marca **8** y los precios mostrados van de $1,450,000 a $7,400,000. El resultado correcto sería 0, con el estado vacío.
- Impacto: el filtro devuelve lo contrario de lo que dice. Es un error funcional visible en la demo.
- Propuesta: convertir el valor en un rango, por ejemplo `value="8000000-"`, con `min`/`max` parseados, o agregar `data-min="8000000"` y filtrar con `p.precio > min`. Agregar este caso a `test.js`.

### P1 — Importante

**5. Contraste insuficiente en texto secundario, bordes de campos y en modo oscuro**
- Evidencia (ratios WCAG calculados con `work/contrast.js`):

| Par | Ratio | Mínimo |
|---|---|---|
| `--muted #6E7A70` sobre `--paper #F1ECE1` (`.stats .lbl`, `.section-head p`, `.result-count`) | **3.81** | 4.5 |
| `--muted` sobre `#FFFFFF` (`.card-loc`, labels de filtros, `.form-note`) | **4.49** | 4.5 |
| eyebrow dorado `#B8863B` sobre `#1F4038` (mapa, claro) | **3.52** | 4.5 |
| borde `--line #DCD4C2` de inputs sobre `#F1ECE1` / `#FFF` | **1.25 / 1.47** | 3.0 (1.4.11) |
| oscuro: `.btn-primary` y `.card-tag.venta` `#F6F3E9` sobre `#5C9784` | **3.04** | 4.5 |
| oscuro: `.price-tag.alto` `#FFF` sobre `#E08067` | **2.82** | 4.5 |

- Impacto: afecta a usuarios con baja visión y a cualquiera en exteriores. Los campos del formulario y de los filtros apenas se distinguen del fondo.
- Propuesta (valores verificados): `--muted:#5A665C` (5.11 sobre paper, 6.02 sobre blanco). Eyebrow del mapa `#D6A85C` (5.20). Un token `--field-border:#8F8670` (3.07 / 3.61) para inputs y selects. En oscuro, texto `#14201C` sobre `--green` (4.96) y sobre `--danger` (5.95).

**6. `innerHTML` con datos sin escapar: XSS latente**
- Evidencia: `card.innerHTML` (línea 945) y `els.modalCard.innerHTML` (línea 969) concatenan `p.titulo`, `p.ubicacion`, `p.estado`, `p.tipo`, `p.direccion`, `p.descripcion`, `p.amenidades[]` y `p.zona` (vía `priceAnalysisHTML`, línea 887) sin escapar. Prueba en una copia con `titulo:"Casa <img src=x onerror=…>"`: el código se ejecutó **1 vez al cargar** y **otra al abrir la ficha** (`window.__xss = 2`).
- Impacto: hoy los datos están escritos a mano en el HTML, así que no es explotable. En cuanto vengan de un JSON editable, un Google Sheet, un CMS o un formulario de alta, cualquiera que controle un campo ejecuta JS en el sitio. Ese es justamente el paso de escalabilidad que pide la entrega.
- Propuesta: un escapador de 3 líneas aplicado a **todo** dato interpolado: `const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));`. Mejor aún: construir la tarjeta con un `<template>` en el HTML y llenar los campos con `textContent`. Los íconos SVG (constantes) pueden seguir como HTML.

**7. No hay Content-Security-Policy ni headers de seguridad para el despliegue en Vercel**
- Evidencia: el proyecto no tiene `vercel.json` ni `<meta http-equiv="Content-Security-Policy">`. Todo el JS (~16.9 KB) y el CSS (~17.3 KB) están inline, lo que obliga a usar `'unsafe-inline'` y anula la CSP como defensa contra el hallazgo 6. Hay atributos `style="…"` en el marcado (líneas 714, 727, 731, 783).
- Impacto: sin CSP, un XSS ejecuta cualquier cosa. Sin `frame-ancestors`, el sitio se puede embeber en otro (clickjacking sobre el botón de WhatsApp).
- Propuesta: mover el JS a `app.js` y el CSS a `styles.css`, y convertir los `style=""` en clases. Luego crear `vercel.json`:
  ```json
  { "headers": [{ "source": "/(.*)", "headers": [
    { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'" },
    { "key": "X-Content-Type-Options", "value": "nosniff" },
    { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
    { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" } ] }] }
  ```
  Si las fuentes se alojan en el propio sitio (hallazgo 15), los dos dominios de Google salen de la política. Hay que verificar en la vista previa de Vercel que la consola no muestre violaciones.

**8. Objetivos táctiles por debajo de 44 × 44 px**
- Evidencia (medido a 360 px): `#menuToggle` 38×38; `.modal-close` 36×36; los 8 `.map-pin-btn` 26×29; los selects y `#q` de los filtros 40 de alto; `#btnReset` y "Enviar por WhatsApp" 39 de alto; enlaces de contacto (teléfono, correo, WhatsApp) 17 de alto. En escritorio, los enlaces del nav miden 18 de alto.
- Impacto: toques fallidos en móvil, sobre todo en los pines, que además están muy juntos.
- Propuesta: `.menu-toggle,.modal-close{min-width:44px;min-height:44px}`; `input,select,.btn{min-height:44px}`; `.map-pin-btn{padding:9px}` (área de 44 sin agrandar el ícono); `.contact-list a{display:inline-block;padding-block:12px}`.

**9. Falta el idioma del documento, el `<title>` está en el body y no se anuncian los resultados al filtrar**
- Evidencia: `document.documentElement.lang === ""` (línea 1); `<title>` en la línea 2, dentro de `<body>` (`title_in_head=false`); `[aria-live]` y `[role=status]` en la página: **0**. `.result-count` (línea 695) se actualiza en silencio.
- Impacto: los lectores de pantalla leen el español con voz y reglas de otro idioma. Al filtrar, el usuario ciego no se entera de que cambió la lista.
- Propuesta: `<html lang="es-MX">`, `<title>` dentro de `<head>` y `<p class="result-count" role="status" aria-live="polite">`. Para no anunciar cada tecla, actualizar el contador con debounce (ver 11).

**10. `calcularEtiquetasPrecio` es O(n²): 4.97 s con 10,000 propiedades y 129 s con 50,000**
- Evidencia: `price-tags.js` líneas 45–46 y 53. Por cada propiedad se filtra el arreglo completo, recalculando `grupo()` (concatenación de strings) y `precioM2()` dos veces por par. Al pasar de 1,000 a 10,000 el tiempo se multiplica ×117. Ver la tabla del benchmark. En el navegador (copia instrumentada) bloquea el hilo principal 115 ms con 1,000, 1.1 s con 5,000 y 5.3 s con 10,000.
- Impacto: con las 8 propiedades actuales cuesta 0 ms. A partir de ~2–3 mil la página se congela al cargar.
- Propuesta: dos pasadas O(n). Primero se acumulan `suma` y `cuenta` por grupo. Luego, para cada propiedad, `promedio = (suma − propio) / (cuenta − 1)`; es el mismo leave-one-out. Lo implementé en `reviews/work/bench.js` (`optim`): da **0 etiquetas distintas** contra la original con n = 100, 1,000 y 10,000, y tarda 22 ms con 50,000 (×5,826). No cambia la especificación del estudiante, solo el algoritmo.
- Nota para el estudiante (decisión tuya, no la tomé): la tarjeta 1 se etiqueta "Buena oportunidad, −49 %" con **1 solo comparable**. Si tu especificación lo permite, podrías exigir un mínimo de comparables para etiquetar. Esto se sale del alcance técnico, así que solo lo señalo.

**11. Se renderizan todas las tarjetas, y dos veces por cada cambio de filtro**
- Evidencia: las líneas 1057–1060 registran `input` **y** `change` en cada select. Un solo cambio de "Tipo" produjo **2** re-renders (MutationObserver). Teclear "casa" produjo 4, sin debounce. Escala medida con la copia instrumentada (1440 px): con 1,000 propiedades hay 41,257 nodos DOM y el render inicial toma 124 ms; con 10,000 hay **410,257 nodos**, el render toma 1.18 s, el documento mide 1.43 M px de alto y **cada cambio de filtro tarda 1.36 s**. Cada tarjeta incluye un SVG de ~1.3 KB generado como string.
- Impacto: la interfaz se traba al filtrar con catálogos medianos y el consumo de memoria en móvil es alto.
- Propuesta: escuchar solo `change` en los selects y `input` con debounce de 150 ms en `#q`. Paginar: renderizar 24 tarjetas y un botón "Ver más (N restantes)". Construir en un `DocumentFragment` y hacer un solo `replaceChildren()`. Agregar `.card{content-visibility:auto; contain-intrinsic-size:auto 420px}`. Definir el SVG de la casa una vez con `<symbol>` y reutilizarlo con `<use href="#house">` en lugar de repetir ~1.3 KB por tarjeta.

**12. En móvil, la ficha es más alta que la pantalla y el botón de cerrar se va con el scroll**
- Evidencia: a 360 px el modal mide 328×**932** px en un viewport de 800. `.modal-close` está en `position:absolute` dentro de `.modal-media` (líneas 513–515), así que al desplazarse desaparece (captura `shots/a11y-360-modal-scroll.png`). La única salida visible es tocar los 16 px de fondo a los lados; Escape no existe en un teclado táctil.
- Impacto: el usuario móvil puede quedar "atrapado" o recurrir al botón Atrás, que lo saca del sitio.
- Propuesta: hacer el botón de cerrar `position:sticky; top:8px` (en un contenedor sticky de cabecera), o un `<dialog>` a pantalla completa en ≤560 px con cabecera fija y `.modal-body{overflow:auto}`. Opcional: que Atrás cierre la ficha con `history.pushState` y `#propiedad-N`.

### P2 — Mejoras

**13. El formulario acepta datos vacíos o inválidos, y el teléfono y el WhatsApp de ejemplo se publican tal cual**
- Evidencia: con Nombre = "␣␣␣" y Teléfono = "␣␣␣" (o "abc") el formulario se envía y abre `wa.me` (se abrió un popup en la prueba): `required` acepta espacios. `#cPhone` es `type="text"`, sin `inputmode`, `autocomplete`, `pattern` ni `maxlength`. `CONFIG.whatsappNumero = "525512345678"` y `tel:+525512345678` (líneas 748 y 813) son de ejemplo, y si alguien los despliega apuntan a un número real ajeno. Que el número esté en el HTML es inevitable con wa.me; no es un secreto.
- Propuesta: `<input type="tel" inputmode="tel" autocomplete="tel" pattern="[0-9 +()-]{10,15}" maxlength="20">`, `autocomplete="name"` en el nombre, `minlength="2"`, y en el submit `if(!name || !/\d{10}/.test(phone.replace(/\D/g,''))) { setCustomValidity…; reportValidity(); return; }`. Antes del deploy, reemplazar o retirar el número de ejemplo y centralizarlo en un solo lugar (hoy está en `CONFIG` y otra vez en el HTML, línea 748).

**14. Datos embebidos en el HTML y estadísticas fijas que no coinciden con los datos**
- Evidencia: `PROPERTIES` ocupa 3.8 KB inline. Con el mismo esquema (y descripciones mínimas), 1,000 propiedades son 236 KB de JSON y 10,000 son 2.4 MB, que se descargarían en cada visita, aunque solo cambien los datos, sin cache independiente. Las estadísticas dicen "**18** Propiedades activas" y "**6** Zonas cubiertas" (líneas 638–640), pero hay 8 propiedades y 3 zonas. `test.js` extrae los datos con una regex sobre el HTML, lo que es frágil.
- Propuesta: pasar los datos a `/data/properties.json`, cargarlos con `fetch` y mostrar un estado de carga. En `vercel.json`, poner `Cache-Control: public, max-age=300, stale-while-revalidate=86400` para `/data/*` y caché larga para los assets. Calcular las estadísticas desde los datos (`PROPERTIES.length`, `new Set(zonas).size`). `test.js` puede leer el JSON directamente.

**15. Google Fonts bloquea el render y es una dependencia externa**
- Evidencia: las líneas 3–5 piden 2 familias con 10 variantes (Fraunces en 400/500/600/700/500 itálica; Libre Franklin en 400–800) mediante un `<link rel=stylesheet>` que bloquea el render, más 2 orígenes externos. El resto del sitio pesa 49 KB (13.3 KB gzip) más 2.6 KB (1.0 KB gzip). Las fuentes probablemente pesen más que todo el sitio.
- Propuesta: alojar en `/fonts/` 3 archivos woff2 (Fraunces 600, Libre Franklin 400 y 700), con subconjunto latino y `font-display:swap`, y `<link rel="preload" as="font" type="font/woff2" crossorigin>` solo para la del h1. Esto también simplifica la CSP (hallazgo 7).

**16. Semántica de las tarjetas y SVG decorativos**
- Evidencia: `<article role="button">` contiene un `h3` (8 casos). El rol `button` vuelve presentacionales a sus hijos, así que los títulos dejan de servir para navegar por encabezados. Las tarjetas no tienen URL propia. Hay 63 `<svg>` en la página y **0** con `aria-hidden`, `role` o `<title>`. Al abrir la ficha queda un id duplicado (`sky4`), porque `houseArt(p.id+3)` coincide con el gradiente de otra tarjeta (línea 971).
- Propuesta: `<article class="card"><h3><a href="#propiedad-3" class="card-link">Título</a></h3>…</article>`, con `.card-link::after{content:"";position:absolute;inset:0}` para que toda la tarjeta sea clicable, y abrir la ficha según el hash (de paso se puede compartir el enlace). `aria-hidden="true" focusable="false"` en todos los íconos. Ids de gradiente con prefijo de contexto (`sky-card-1`, `sky-modal-1`).

**17. No se respeta `prefers-reduced-motion`**
- Evidencia: hay 0 reglas `@media (prefers-reduced-motion)`. Con `reduced_motion=reduce`, `.card` mantiene `transition: transform .18s, box-shadow .18s` y sigue desplazándose al pasar el cursor. `.btn` y `.fab-wa` también se transforman.
- Propuesta: `@media (prefers-reduced-motion: reduce){ *,*::before,*::after{transition-duration:.01ms!important; animation-duration:.01ms!important} .card:hover,.btn:hover,.fab-wa:hover{transform:none} }`.

**18. En móvil, los filtros, la cabecera y el botón flotante ocupan demasiado espacio**
- Evidencia: a 360 y 390 px la barra de filtros mide 211 px de alto, en 2 columnas de 140 px; "Cualquier precio" se trunca como "Cualquier prec…" (`shots/a11y-360-filtros.png`). La cabecera sticky mide 90 px (11 % del viewport) porque la marca "Home Finder" se parte en 2 líneas. El FAB de WhatsApp (56 px, fijo) tapa la esquina de las tarjetas y la etiqueta "Precio alto" mientras se desplaza.
- Propuesta: en ≤560 px, poner los filtros en una sola columna dentro de un `<details><summary>Filtros (n activos)</summary>`; `.brand{white-space:nowrap}` y ocultar el texto "WhatsApp" del botón del nav en ≤400 px (dejar el ícono con `aria-label`); `main{padding-bottom:88px}` y bajar la opacidad del FAB o esconderlo mientras se hace scroll hacia abajo.

---

## Benchmark de `calcularEtiquetasPrecio` (Node 22, datos sintéticos con el mismo esquema, 6 zonas × 3 tipos)

Se reporta la mediana de las repeticiones, después de un calentamiento. "O(n)" es la versión propuesta en `reviews/work/bench.js`.

| n | Original O(n²) | Propuesta O(n) | Aceleración | Etiquetas distintas (verificación) | Tamaño JSON de los datos |
|---:|---:|---:|---:|---:|---:|
| 100 | 0.56 ms | 0.05 ms | ×11 | 0 | 23 KB |
| 1,000 | 42.6 ms | 0.43 ms | ×98 | 0 | 236 KB |
| 10,000 | 4,967 ms | 2.79 ms | ×1,781 | 0 | 2.4 MB |
| 50,000 | **129,125 ms (2 min 9 s)** | 22.2 ms | ×5,826 | no verificado (costo) | 12 MB |

Mediciones en el navegador (copia instrumentada de `index.html`, Chrome, 1440 px):

| n | Etiquetas | `renderGrid` inicial | Nodos DOM | Un cambio de filtro (2 renders) | Carga total |
|---:|---:|---:|---:|---:|---:|
| 8 (actual) | 0 ms | 13 ms | 575 | 2 ms | 0.11 s |
| 100 | 5 ms | 22 ms | 4,357 | 11 ms | 0.18 s |
| 1,000 | 115 ms | 124 ms | 41,257 | 90 ms | 0.70 s |
| 5,000 | 1,102 ms | 519 ms | 205,251 | 511 ms | 4.61 s |
| 10,000 | 5,307 ms | 1,181 ms | 410,257 | 1,359 ms | 12.5 s |

Lectura: con datos reales del tamaño de un curso, nada de esto se nota. El límite práctico del diseño actual ronda las ~1,000 propiedades (hasta ahí la carga está por debajo de 1 s). Con el algoritmo O(n) más la paginación del hallazgo 11, el cuello de botella pasa a ser la descarga del JSON y deja de ser el CPU.

---

## Lo que está bien y hay que conservar

1. **No hay desborde horizontal en ningún ancho**: `scrollWidth` es igual al viewport en 360, 390, 768, 1024 y 1440. El grid pasa de 3 a 2 y a 1 columna correctamente, y `viewport-fit=cover` con `env(safe-area-inset-*)` está bien aplicado.
2. **Muy ligero y sin dependencias**: 49 KB (13.3 KB gzip) más 2.6 KB de JS, 0 imágenes rasterizadas (todo es SVG inline), DOMContentLoaded local en 155 ms y 586 nodos DOM. Encaja perfecto con un deploy estático en Vercel sin build.
3. **Formularios y tarjetas con nombre accesible**: todos los campos tienen `<label for>`; las tarjetas exponen "Ver detalles de …", funcionan con Enter y Espacio, el foco es visible (`:focus-visible` con 6.36:1) y Escape cierra la ficha.
4. **Enlaces externos bien construidos**: todos los `target="_blank"` llevan `rel="noopener"`, `window.open(…, "noopener")` se usa en el envío, y los textos de `wa.me` y Google Maps pasan por `encodeURIComponent`. El `<select>` de interés se llena con `textContent`, que es seguro.
5. **`price-tags.js` está separado, es puro y se puede probar**: funciona en Node y en el navegador, maneja el caso sin superficie o sin comparables (`null` + `motivo`) y aplica leave-one-out. Para escalar solo hace falta cambiar el algoritmo, no la interfaz.

Capturas de esta auditoría: `/home/claude/reviews/shots/a11y-*.png` (20 archivos).
