# Auditoría de diseño UI: Home Finder

**Revisó:** director de diseño UI (revisión visual con Playwright y Chrome, 1440x900 y 390x844, modo claro y oscuro)
**Capturas:** `/home/claude/reviews/shots/ui-*.png`
**Nota:** las fuentes de Google no cargan sin internet, así que todo se juzgó con Georgia y la sans de respaldo. Eso no se reporta como hallazgo.

## Resumen

La base visual es buena para un proyecto de curso. Tiene una paleta propia (verde bosque, crema y dorado) organizada en tokens, una pareja serif + sans con *eyebrows* bien resuelta y tarjetas consistentes. Así como está, no pasaría por un producto real: el modo oscuro rompe la sección del mapa, en móvil el menú no hace nada, las etiquetas de precio se confunden con el estado de la propiedad y la misma ilustración de casa aparece en todas las fichas (también en las de terrenos y departamentos). A esto se suman cifras que se contradicen (dice "18 propiedades" y muestra 8) y un aviso de "sitio de ejemplo" que le quitan credibilidad.

**Calificación del área: 6/10.** Con los P0 y P1 corregidos estaría en 8.

---

## Hallazgos priorizados

### P0: se ve roto o rompe algo

#### 1. En modo oscuro el panel del mapa queda verde menta y su texto no se lee
- **Evidencia:** `ui-desk-dark-mapa.png` y `ui-desk-dark-full.png`. `.map-panel{background:var(--green-deep)}` usa un token que en oscuro cambia a `#7BB3A0` (menta claro), pero los textos del panel tienen colores fijos para fondo oscuro: `.map-panel h2{color:#F1ECE1}`, `.map-panel p{color:#CBDAD3}`, `.map-legend{color:#9FB6AC}` y el eyebrow en línea `style="color:var(--gold)"`. Ratios WCAG medidos: título **2.03:1**, párrafo **1.65:1**, leyenda **1.11:1**, eyebrow dorado `#D6A85C` **1.09:1**. Encima, el mapa interno (`#173229`, fijo) queda como un rectángulo oscuro pegado sobre el menta.
- **Impacto:** toda una sección se ve como un error de render. Cualquiera con el sistema en modo oscuro (algo común en iPhone) la encuentra así.
- **Propuesta:** darle al panel su propio token que no se invierta. Debe ser una superficie oscura en los dos modos:
  ```css
  :root{ --panel-deep:#1F4038; }
  /* en los bloques de dark: */ --panel-deep:#183A31;
  .map-panel{ background:var(--panel-deep); }
  .map-panel .eyebrow{ color:#E0B66E; }   /* 6.0:1 sobre #1F4038; quitar el style inline */
  ```
  Con eso, en oscuro `#F1ECE1/#183A31` da 10.6:1 y `#CBDAD3` da 8.6:1. Para separar el panel del fondo `#14201C`, basta un `border:1px solid rgba(241,236,225,.08)`.

#### 2. En móvil el menú no funciona y el logo se parte en dos líneas
- **Evidencia:** `ui-mob-menu-click.png`. En `<860px` `.nav-links` está `display:none` y se muestra `#menuToggle`, pero el JS no tiene ningún listener para ese botón (lo verifiqué: tras el clic `.nav-links` sigue invisible). Además "Home Finder" se corta en "Home / Finder" porque `.brand` no tiene `white-space:nowrap` y compite con el botón "WhatsApp" (ver `ui-mob-header.png`).
- **Impacto:** en móvil (la mayoría del tráfico inmobiliario en México) el usuario no puede navegar a Nosotros, Ubicaciones ni Contacto, y el encabezado se ve descuadrado desde la primera pantalla.
- **Propuesta:** `.brand{white-space:nowrap}`. Cuando el ancho sea menor a 560px, quitar el texto del botón WhatsApp del header (ya existe el FAB) o dejar solo el ícono en un círculo de 40x40. Implementar el menú como un panel desplegable:
  ```css
  @media (max-width:860px){
    .nav-links.open{display:flex;flex-direction:column;position:absolute;inset:100% 0 auto;
      background:var(--paper);border-bottom:1px solid var(--line);padding:8px 20px 16px;gap:0}
    .nav-links.open a{display:block;padding:12px 0;font-size:1rem}
  }
  ```
  ```js
  menuToggle.addEventListener("click",()=>{const o=navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded",o)});
  ```
  Cerrar el menú al hacer clic en un enlace.

#### 3. En modo oscuro los íconos de cerrar (X) y de menú salen negros sobre fondo oscuro
- **Evidencia:** `ui-desk-dark-modal5b.png`: la X del modal casi no se ve. El color calculado de `.modal-close` y `#menuToggle` es `rgb(0,0,0)` y da **1.36:1** contra `#1B2723`. Hay dos causas. La primera hoja de estilo fija `:root{color-scheme:light}`, por lo que el `buttontext` del sistema sigue siendo negro. La segunda: `button{font-family:inherit}` no hereda `color`.
- **Impacto:** en el modo oscuro no hay forma visible de cerrar la ficha en móvil ni de abrir el menú.
- **Propuesta:** `button{font:inherit;color:inherit}`. Cambiar el `color-scheme:light` del primer `<style>` por `color-scheme:light dark` (y dentro de `:root[data-theme="dark"]` poner `color-scheme:dark`). Así los scrollbars y controles nativos también se adaptan.

---

### P1: afecta mucho la percepción o el uso

#### 4. Las etiquetas de precio se confunden con la insignia de estado y su señal parece más segura de lo que es
- **Evidencia:** `ui-desk-catalogo.png` y `ui-mob-card5-zoom.png`. `.card-tag` (estado) y `.price-tag` (precio) usan el mismo componente: píldora, 11.2px, peso 800, MAYÚSCULAS, misma altura y misma fila sobre la imagen. "EN VENTA" (`#2F5D50`) y "BUENA OPORTUNIDAD" (`#2E7D4F`) son casi el mismo verde: el contraste entre los dos fondos es apenas **1.49:1**. El usuario ve dos pastillas verdes y no sabe cuál es el estado y cuál la opinión de precio. "PRECIO ALTO" usa rojo sólido `--danger` (en oscuro `#E08067` con blanco: **2.82:1**, no pasa AA), que suena a alerta o error y no a un dato. En las tarjetas 4, 6 y 7 el sol de la ilustración queda detrás de la etiqueta. Hay un tercer problema: 6 de las 8 propiedades tienen etiqueta y **ninguna** queda "en rango". En la ficha 1 se lee "−49% … (1 comparable en CDMX)", que compara una casa contra un departamento (`ui-desk-modal1.png`). Un "BUENA OPORTUNIDAD" grande que se apoya en un solo comparable debilita la confianza en todo el sitio.
- **Impacto:** el valor diferencial del proyecto (Assignment 2) se lee como ruido o como alarma, no como análisis.
- **Propuesta (visual):** sacar la señal de precio de la imagen y ponerla en el cuerpo de la tarjeta, pegada al precio, con otro lenguaje visual: *sentence case*, ícono, fondo tintado y sin color sólido.
  ```html
  <div class="price-signal is-low">▾ 28% bajo el promedio de la zona</div>
  ```
  ```css
  .price-signal{display:inline-flex;gap:6px;align-items:center;font-size:.8rem;font-weight:600;
    padding:3px 8px;border-radius:6px;text-transform:none;letter-spacing:0}
  .is-low {background:#E3F1E7;color:#1E6B3F}   /* 5.57:1 */
  .is-high{background:#FBEAE4;color:#9A3A22}   /* 5.99:1 */
  .is-mid {background:#EEF0EC;color:#4A5550}   /* 6.77:1 */
  /* dark */ .is-low{background:#1C3326;color:#8FD3A8} .is-high{background:#3A2019;color:#F2A893}
  ```
  El badge de estado se queda solo, arriba a la izquierda. "Apartada" debería ir en gris neutro, no en el mismo dorado que "Nueva": son estados con significados opuestos (una propiedad apartada no está disponible). En la ficha, `.price-analysis` hoy es verde para todos los casos; debería tomar el color de la señal y llevar un pie del tipo "Basado en N propiedades de {zona}".
  **Fuera de mi área, lo dejo marcado para el alumno:** mostrar la etiqueta solo con 3 o más comparables, o separar casa y departamento, cambia la especificación del Assignment 2. Esa decisión le corresponde a él.

#### 5. La misma ilustración de casa aparece en todas las propiedades (también en terrenos y departamentos) y en la ficha sale recortada
- **Evidencia:** `houseArt()` dibuja siempre la misma casa de dos aguas y solo cambia 3 paletas. "Terreno con vista a la sierra" y "Loft moderno" muestran una casa (`ui-desk-catalogo.png`). En el modal, `.modal-media{aspect-ratio:16/8}` combinado con `preserveAspectRatio="xMidYMid slice"` recorta la puerta y el sol (`ui-desk-modal1.png`, `ui-desk-modal3.png`). En oscuro las ventanas quedan café (`--gold-tint:#332A18`) y el "sol" se ve como una mancha café: las casas parecen abandonadas (`ui-desk-dark-catalogo.png`). Además el modal usa `houseArt(p.id+3)`, una paleta distinta a la de su propia tarjeta, así que la ficha "no es" la misma casa que se clicó.
- **Impacto:** en inmobiliaria la foto es el producto. Ocho imágenes iguales hacen que el catálogo se perciba como plantilla y que el usuario no recuerde cuál vio.
- **Propuesta:** usar fotos reales: `<img src="img/p1.webp" loading="lazy" width="800" height="600" alt="Fachada de …">` con `object-fit:cover; aspect-ratio:4/3`, guardadas en el repo (sigue siendo estático y Vercel las sirve con CDN). Mientras tanto: (a) una ilustración por tipo: torre con ventanas en retícula para departamento; para terreno, un polígono de lote con estacas y sin edificio; (b) en el modal usar `houseArt(p.id)` (misma paleta), `aspect-ratio:16/9` y `preserveAspectRatio="xMidYMax slice"` para anclar la base y que no se corte la puerta; (c) en oscuro definir `--window:#E9C77B` (ventanas iluminadas) en lugar de reutilizar `--gold-tint`, y quitar el sol o convertirlo en luna `#2C3B34`.

#### 6. Cifras que se contradicen y un aviso de "sitio de ejemplo" le quitan credibilidad
- **Evidencia:** `.stats` dice "**18** Propiedades activas" y "**6** Zonas cubiertas", pero el catálogo muestra "8 propiedades encontradas" y el footer menciona 3 ciudades (`ui-desk-full.png`). El footer `.disclaimer` dice "Sitio de ejemplo generado como punto de partida… reemplázalos". "+120 familias instaladas" y "4.9 Calificación promedio" no citan fuente. En móvil, la `.hero-badge` tapa la puerta de la casa principal (`ui-mob-hero.png`).
- **Impacto:** un comprador que va a mover millones de pesos detecta la incongruencia en segundos y deja de creerle al resto, etiquetas de precio incluidas.
- **Propuesta:** calcular las cifras desde los datos: `PROPERTIES.length` y el número de zonas únicas con `new Set(PROPERTIES.map(p=>p.zona)).size`. Borrar `.disclaimer` antes de publicar. Atribuir el 4.9 ("4.9 en Google · 87 reseñas") o quitarlo. Agregar una prueba de confianza concreta: tarjeta de asesor con foto, nombre y cédula o membresía AMPI (si existe), y en la ficha "Publicado hace N días". En móvil: `.hero-badge{left:12px;bottom:12px;transform:scale(.9);transform-origin:left bottom}`, o moverla debajo de la ilustración.

#### 7. Varios textos secundarios no pasan WCAG AA
- **Evidencia (ratios medidos):**
  | Par | Ratio | Dónde |
  |---|---|---|
  | `--muted #6E7A70` / `--paper #F1ECE1` | **3.81** | `.section-head p`, `.result-count`, `.stats .lbl` (12.5px), `.footer-grid`, `.disclaimer`, `.form-note` |
  | placeholder `#757575` / `#F1ECE1` | **3.91** | `#q`, `#cMsg` |
  | `--muted` / `--green-tint` | 3.73 | (si se usa en `.price-analysis`) |
  | eyebrow dorado `#B8863B` / `#1F4038` | **3.52** | "UBICACIONES" en el mapa |
  | Oscuro: `#F6F3E9` / `--green #5C9784` | **3.04** | `.btn-primary`, `.card-tag.venta` |
  | Oscuro: `#FFF` / `--danger #E08067` | **2.82** | `.price-tag.alto` |
  | `--muted` / `#FFF` | 4.49 (límite) | `.card-loc`, `.field label` |
  Los pares que sí pasan bien: tinta principal, `--ink-soft` (7.95), chips (9.44), badges en claro (5.05 a 5.37) e ícono del FAB (8.61).
- **Impacto:** el texto de apoyo se lee lavado, sobre todo en exteriores con el celular y para usuarios mayores, que son un segmento clave de compradores de vivienda.
- **Propuesta:** `--muted:#5A665D` (5.10 sobre paper, 6.01 sobre blanco); `::placeholder{color:#6B756D}` (4.78 sobre blanco). En oscuro, cambiar el texto de `.btn-primary` y `.card-tag.venta` a `#0F1D19` (5.14) o oscurecer el fondo a `#3F7A67` con texto blanco (5.01). En oscuro, `.price-tag.alto` mantiene `#B4482E` con blanco (5.37), o se reemplaza por la señal tintada del hallazgo 4.

#### 8. Escala tipográfica pequeña y el precio no domina la tarjeta
- **Evidencia:** el primer `<style>` fija `body{font:14px …}` y la segunda hoja nunca lo corrige, así que el cuerpo queda en 14px. Los textos que se derivan de él son aún más pequeños: `.card-specs` 13.1px, `.card-tag`/`.price-tag`/`.field label` 11.2px, `.eyebrow` 11.5px, `.stats .lbl` 12.5px. En la tarjeta, el título `h3` mide 1.08rem y el precio `.card-price` 1.02rem, metido en una píldora sobre la imagen que tapa la pared de la casa (`ui-mob-card5-zoom.png`). El precio no dice "MXN".
- **Impacto:** el dato número uno de un listado (precio) compite con el título y se pierde sobre la ilustración. El texto de 11 a 13px cansa en móvil.
- **Propuesta:** `body{font-size:1rem}` (16px). Escala: 12px solo para badges y labels (0.75rem, peso 700), 14px para metadatos (`.card-loc`, `.card-specs` en 0.875rem), 16px para cuerpo, 20px para título de tarjeta (`.card-body h3{font-size:1.15rem}`). Mover el precio al cuerpo como primer elemento: `.card-price{position:static;background:none;box-shadow:none;padding:0;font-size:1.4rem;color:var(--ink)}`, seguido de `<small>MXN</small>` a 0.75rem en `--muted`. Debajo el título y luego la ubicación. Opcional: mostrar el precio por m² en gris ("$26,944/m²"), que además conecta visualmente con las etiquetas.

#### 9. Las especificaciones de la tarjeta no tienen unidades y el ícono de m² parece una flecha de "subida"
- **Evidencia:** `.card-specs` muestra "🛏3 🛁2 ↗180 m²". `ICONS.ruler` es `path d="m3 16 5-5 3 3 9-9"` + `M14 5h6v6`, que es el ícono de *trending up* y no una regla; en un sitio que habla de "plusvalía" se lee como "sube 180". En el modal aparece "1 recámaras" y "1 baños" (`ui-mob-modal5.png`), sin singular.
- **Impacto:** el usuario tiene que adivinar qué significa cada número; la gramática descuidada resta profesionalismo.
- **Propuesta:** texto corto con la unidad visible: "3 rec. · 2 baños · 180 m²". Usar un ícono de regla real (`<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2m2-6 2 2m2-6 2 2"/>`) o el de plano/área. En el modal: `n + (n===1?' recámara':' recámaras')`. Para terrenos: "600 m² de terreno".

#### 10. El modal no se comporta como un diálogo: el foco y el scroll se quedan detrás
- **Evidencia:** al abrir la ficha, `document.activeElement` sigue siendo la `ARTICLE` de la tarjeta, y con Tab el foco pasa a la siguiente `.card` **detrás** del velo. `body` conserva `overflow:visible`, así que el fondo hace scroll. No hay `role="dialog"`/`aria-modal`, ni animación de entrada (aparece de golpe). En móvil el modal empieza a 32px y su borde superior choca con el header sticky (`ui-mob-modal5.png`).
- **Impacto:** la ficha, que es la pantalla de conversión, se siente frágil. Con teclado o lector de pantalla no se puede usar.
- **Propuesta:** usar el `<dialog>` nativo, que funciona igual en un sitio estático: `dialog.showModal()` resuelve foco, Escape, `::backdrop` y la inercia del fondo. Agregar `dialog::backdrop{background:rgba(10,16,13,.55)}`, `html:has(dialog[open]){overflow:hidden}` y la entrada `@starting-style{dialog[open]{opacity:0;transform:translateY(12px)}} dialog{transition:opacity .2s, transform .2s, display .2s allow-discrete}`. En móvil (`<560px`), que el modal funcione como *bottom sheet*: `margin:auto 0 0; border-radius:22px 22px 0 0; max-height:92dvh`, con los botones "Preguntar por WhatsApp" y "Abrir en Google Maps" fijos al pie (`position:sticky;bottom:0`).

#### 11. En móvil el FAB de WhatsApp tapa contenido y los filtros se truncan
- **Evidencia:** `ui-mob-catalogo.png`: el FAB (56px, fijo a 18px) queda encima del título "Casa contemporánea con jardín". En `ui-mob-contacto.png` tapa el final de `.form-note`. En el header ya hay otro botón WhatsApp verde, así que son dos CTAs idénticos en la misma pantalla. En `ui-mob-toolbar-zoom.png` el select "Cualquier precio" se corta en "Cualquier precio" sin la última letra, y el placeholder "Colonia, ciudad o título…" en "Colonia, ciudad".
- **Impacto:** el contenido tapado y los textos cortados se perciben como "no terminado".
- **Propuesta:** `main{padding-bottom:88px}` en móvil. Ocultar el FAB mientras el modal o el formulario de contacto estén en vista (con un IntersectionObserver sobre `#contacto`). Quitar el WhatsApp de texto del header en `<560px`. En la toolbar móvil: búsqueda a ancho completo (`.toolbar .field:first-child{grid-column:1/-1}`), opciones más cortas ("Cualquiera", "≤ $3M", "≤ $5M") y placeholder "Colonia o ciudad".

#### 12. El "mapa" no es creíble: pines en posiciones inventadas que mezclan 3 ciudades y no dicen nada
- **Evidencia:** `ui-desk-mapa.png`. `renderMap()` coloca 8 pines dorados idénticos sobre una retícula abstracta con `p.pos.x/y` arbitrarios: Del Valle, Zapopan y Juriquilla parecen estar a centímetros. Al pasar el cursor solo cambia el color a crema y la información queda en `title`, que no aparece en táctil. La leyenda dice "Toca un pin para ver la propiedad" a 0.8rem en `#9FB6AC`.
- **Impacto:** un usuario que conoce la ciudad nota enseguida que el mapa es decorativo, y eso contamina la confianza en las direcciones reales.
- **Propuesta (sin dependencias):** cambiar a "Por ciudad". Tres tabs (CDMX · Guadalajara · Querétaro), cada uno con una imagen estática del mapa real guardada en `/img/map-cdmx.webp` (exportada una vez de OpenStreetMap, con su atribución) y pines posicionados por porcentaje. Los pines deben ser etiquetas con precio, al estilo Airbnb: `<button class="pin">$4.8M</button>` con `background:var(--paper-raised);color:var(--ink);font:700 .8rem/1 var(--font-body);padding:6px 10px;border-radius:100px;box-shadow:var(--shadow)`; el activo, con `background:var(--ink);color:var(--paper)`. Si no se va a hacer esto, retitular la sección como "Zonas donde trabajamos" para no prometer un mapa.

---

### P2: pulido

#### 13. Los campos del formulario parecen deshabilitados y "Limpiar" no está alineado
- **Evidencia:** los inputs usan `background:var(--paper)` (#F1ECE1) dentro de un panel blanco: contraste de fondo de 1.18 y borde `--line` de **1.47:1** (WCAG 1.4.11 pide 3:1 para el límite de un control). Se ven como bloques grises inactivos (`ui-mob-contacto.png`). En escritorio, "Limpiar" queda más arriba que los selects (`ui-desk-catalogo.png`): `.field-btn` alinea con `flex-end`, pero el botón mide 38px y los controles 41px, y además no tiene label encima. `#cPhone` es `type="text"`, así que en móvil abre el teclado alfabético.
- **Propuesta:** `input,select,textarea{background:var(--paper-raised);border-color:#958C78}` (3.33:1 contra blanco) y foco con `box-shadow:0 0 0 3px color-mix(in srgb,var(--green) 25%,transparent)`. "Limpiar" como enlace de texto ("Limpiar filtros", `--green`, subrayado) que solo aparece cuando hay un filtro activo, con `height:41px`. Usar `type="tel" inputmode="tel" autocomplete="tel"` y `autocomplete="name"`.

#### 14. Los íconos no son consistentes y el ritmo vertical se pierde en "Nosotros"
- **Evidencia:** WhatsApp aparece con dos glifos distintos: el logo completo en header y FAB, y solo la burbuja en "Enviar por WhatsApp" y en el modal. El corazón se usa para "+120 familias" y también para "Escríbenos por WhatsApp" (`.contact-list`), cuando el corazón no significa chat. En `ui-desk-full.png`, `.about-art` es un cuadrado 1:1 de unos 500px con una casita al centro: es el bloque más grande de la página y el que menos información da; el bloque de texto a su lado parece flotar.
- **Propuesta:** definir un solo `ICONS.whatsapp` (logo completo) y reutilizarlo en los 4 lugares; en contacto, ícono de burbuja de chat. En `.about-art`: `aspect-ratio:4/3;max-height:360px`, o reemplazarlo por una foto del equipo o del asesor (refuerza el hallazgo 6). Unificar el ritmo con una escala de espaciado (8, 16, 24, 40, 64) y `.section{padding-block:64px}`; hoy conviven 22, 26, 30, 34, 36, 44 y 56px sin patrón.

#### 15. Microinteracciones mínimas y sin `prefers-reduced-motion`
- **Evidencia:** el hover de `.card` solo hace `translateY(-3px)` con sombra, y la imagen no responde. Al filtrar, la grilla se reemplaza de golpe con `innerHTML=""` y el contador cambia sin transición. Los pines del mapa no tienen estado de foco visible propio. No existe ninguna regla `@media (prefers-reduced-motion)`.
- **Propuesta:** `.card:hover .card-media svg{transform:scale(1.03);transition:transform .4s ease}`; fade de 150ms al re-renderizar (`.grid{animation:fade .15s}` al cambiar filtros); en el título de la tarjeta, `.card:hover h3{color:var(--green)}`; chips de filtros activos sobre el contador ("Departamento ✕ · 2+ rec ✕"); `@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}`.

---

## Lo que está bien y hay que conservar

1. **Paleta y tokens:** verde bosque, crema y dorado le dan personalidad cálida y "de patrimonio", lejos del azul genérico de los portales. Está organizada en variables CSS (`--ink`, `--paper`, `--green`…), lo que hace viables el modo oscuro y los arreglos de arriba con pocos cambios.
2. **Sistema tipográfico display + sans con eyebrows** (`.eyebrow` en 0.72rem, tracking 0.14em, verde) y `h1 em` en itálica verde: da una jerarquía editorial clara en el hero y en los encabezados de sección. Los `font-variant-numeric:tabular-nums` en precios y stats son un detalle profesional.
3. **Componente tarjeta consistente:** radios (`--radius-lg/md/sm`), borde `--line`, separador antes de specs y `margin-top:auto` para alinear los pies, que se ven parejos en toda la grilla.
4. **El análisis de precio en la ficha es transparente:** "$26,944/m² vs. promedio de $53,061/m² (1 comparable en CDMX) → −49%" muestra el cálculo en lugar de una caja negra. Es el mejor recurso de confianza del sitio; solo le falta el tratamiento visual del hallazgo 4.
5. **Bases de accesibilidad y flujo de WhatsApp:** `:focus-visible` definido, tarjetas con `tabindex`, `role="button"`, `aria-label` y Enter/Espacio; estado vacío con mensaje útil (`ui-desk-empty.png`); mensajes de WhatsApp precargados con nombre, propiedad y precio, que es la forma de contacto que el mercado mexicano espera.
