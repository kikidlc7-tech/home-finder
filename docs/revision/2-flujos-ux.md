# Home Finder — Auditoría de flujos y UX (Producto / UX research)

Recorrido real con Playwright + Chrome en escritorio (1440x900) y móvil (390x844) sobre `file:///home/claude/review-snapshot/index.html`. No hay errores de consola. Capturas en `/home/claude/reviews/shots/ux-*.png`. Los scripts del recorrido están en `/home/claude/uxscripts/` (`run.py`, `edge.js`); no se modificó nada del snapshot.

## Resumen

1. El sitio se ve profesional y el catálogo filtra, abre la ficha y arma mensajes de WhatsApp bien redactados. Lo básico de "navegar y ver" funciona.
2. Pero dos de las cinco tareas no se pueden completar de verdad: (e) volver a una propiedad o compartirla no tiene ningún mecanismo, y (c) todos los contactos terminan en un número y un correo de plantilla (`525512345678`, `hola@homefinder.mx`). Además, la etiqueta "Buena oportunidad" sale por construcción y no por mercado: cada grupo tiene **1 solo comparable**.
3. Para que "2 funciones reales usables de principio a fin" se sostenga ante el evaluador, lo prioritario es: un contacto real, enlace por propiedad (`#p-1`), una etiqueta explicada y honesta, y quitar las cifras inventadas.

**Calificación del área (flujos/UX): 4/10.** La base visual y técnica es buena. La confianza y la continuidad de los flujos no lo son.

---

## Mapa del recorrido por tarea

### (a) Encontrar un departamento en CDMX de menos de $6,000,000. Severidad: **P1**

| Paso | Escritorio | Móvil | Fricción |
|---|---|---|---|
| 1. Llegar al catálogo | Scroll o "Ver propiedades" | Hay que bajar hero + stats (unos 2 pantallazos). El ☰ no funciona (ver H4) | Media |
| 2. Escribir "CDMX" en Buscar | 2 resultados | Igual | Funciona solo porque `ubicacion` contiene "CDMX". Con "Ciudad de México" salen **0** |
| 3. Tipo = Departamento | 1 resultado | Igual | OK |
| 4. Presupuesto | No existe "Hasta $6M". Con "Hasta $5,000,000" salen **0** (`ux-*-02-a-depto-cdmx-5M.png`). Con "Hasta $8,000,000" sale 1 | El select se corta: "Hasta $5,000,00" | **Se traba aquí**: el escalón correcto no existe y el estado vacío no dice "hay 1 a $5.2M" |
| 5. Resultado | "Depto con vista panorámica", $5,200,000, con etiqueta roja **PRECIO ALTO** | Igual | El único resultado de la búsqueda sale marcado como caro, comparado contra una **casa** de otra colonia (ver H2) |

Se completa, pero solo si el usuario adivina "Hasta $8M" y no confía en la etiqueta.

### (b) Entender "Buena oportunidad" y decidir si confiar. Severidad: **P0**

1. En la tarjeta, la píldora verde "BUENA OPORTUNIDAD" no tiene tooltip, leyenda ni texto de ayuda (`ux-desk-04-b-cards.png`).
2. Al abrir la ficha aparece: `Buena oportunidad · $26,944/m² vs. promedio de $53,061/m² (1 comparable en CDMX) → -49%.` (`ux-desk-05-b-modal.png`).
3. No dice cuál es "el comparable" (es el depto de Roma Norte, un tipo y una colonia distintos). No dice el umbral (15%) ni que casas y deptos se mezclan.
4. Para terrenos dice "Sin propiedades comparables en Guadalajara", pero el catálogo **sí** tiene 3 propiedades en Guadalajara (`ux-desk-07-terreno-modal.png`).

**Se traba aquí:** un comprador informado concluye que no debe confiar en la etiqueta, y tiene razón (H2).

### (c) Contactar a la inmobiliaria por una propiedad. Severidad: **P0**

- **Desde la ficha:** "Preguntar por WhatsApp" lleva a `https://wa.me/525512345678?text=Hola%2C%20me%20interesa%20la%20propiedad%20%22Casa%20contempor%C3%A1nea…%20%C2%BFPodemos%20agendar%20una%20visita%3F`. El mensaje está muy bien armado (título, colonia, precio), pero el número es de plantilla.
- **Desde el formulario:** con los campos vacíos sale el mensaje nativo **en inglés**: "Please fill out this field." (falta `lang="es"`). Con teléfono "abc" lo acepta. Al enviar abre una pestaña nueva a wa.me (`window.open`), sin confirmación en la página y sin limpiar el formulario (`ux-*-10-c-after-submit.png`).
- La ficha no tiene botón "Agendar visita" que te lleve al formulario con la propiedad ya elegida en `#cInterest`. El usuario tiene que recordar el título y buscarlo en un select de 9 opciones.
- **Se traba aquí:** cualquier mensaje real le llega a un número ajeno, y el footer reconoce que "datos de contacto son ilustrativos".

### (d) Búsqueda sin resultados y recuperarte. Severidad: **P1**

1. Buscar "Polanco" muestra "0 propiedades encontradas" y la caja punteada "No encontramos propiedades con esos filtros. Prueba ampliando tu búsqueda." (`ux-*-08-d-empty.png`).
2. No hay botón dentro del estado vacío, no se dice qué filtro estorba y no se sugieren alternativas. En móvil, "Limpiar" queda arriba del contador y sí se ve.
3. Falsos vacíos que el usuario no puede entender: "queretaro" (sin acento) da **0**, mientras "Querétaro" da 3.
4. El bug inverso: "Más de $8,000,000" devuelve **las 8** propiedades, todas de menos de $8M.

Se recupera con "Limpiar", pero pierde todo lo que había filtrado.

### (e) Volver a encontrar una propiedad o compartirla. Severidad: **P0**

1. Al abrir una ficha, la URL sigue siendo `index.html`, sin hash ni parámetro (verificado: `url_after_modal`).
2. No hay favoritos, botón "Compartir" ni "Copiar enlace". Los filtros se pierden al recargar.
3. En Android, el botón "Atrás" con la ficha abierta **sale del sitio**, porque el modal no crea entrada de historial.
4. La única forma de "compartir" es reenviar el mensaje de WhatsApp a la inmobiliaria.

**No se puede completar.**

---

## Hallazgos priorizados

### P0. Impiden completar una tarea

**H1. Todo el contacto termina en datos de plantilla (número, correo y teléfono)**
- *Evidencia:* `CONFIG.whatsappNumero: "525512345678"` y `tel:+525512345678` / `mailto:hola@homefinder.mx` en `#contacto`. Lo usan 5 puntos de contacto: `#navWaBtn`, `#fabWa`, `#contactWaLink`, el CTA de la ficha y el submit de `#contactForm`. El footer dice: "Las propiedades, precios y datos de contacto son ilustrativos — reemplázalos por tu información real."
- *Impacto:* la conversión principal del sitio le llega a un desconocido. El evaluador verá en el footer que el sitio se declara a sí mismo como plantilla. La tarea (c) no es "usable de principio a fin".
- *Propuesta:* poner en `CONFIG` un número de WhatsApp que el equipo controle (puede ser un número de prueba del estudiante) y un correo real. Que `tel:`/`mailto:` del HTML se generen desde `CONFIG` para no duplicarlos. Reescribir el disclaimer a algo honesto y propio: "Proyecto académico: propiedades de ejemplo; los mensajes llegan al equipo de Home Finder."

**H2. "Buena oportunidad" sale por construcción, no por mercado (1 comparable por grupo, casa vs. depto)**
- *Evidencia:* `node test.js` da `n=1` en las 6 propiedades etiquetadas, y los 2 terrenos quedan sin etiqueta. Con 2 propiedades por grupo y leave-one-out, si A/B ≤ 0.85 entonces B/A ≥ 1.176: **una siempre sale "oportunidad" y la otra "alto"**. Así pasa en CDMX (#1 −49% / #2 +97%), GDL (#4 −29% / #7 +40%) y QRO (#6 −42% / #5 +72%). `grupo()` en `price-tags.js` mezcla "Casa" y "Departamento" (una casa de 180 m² en Del Valle contra un depto nuevo de 98 m² en Roma Norte). `PROMPT_LOG.md` ya documenta esta limitación (fila 1 y nota ⚠️).
- *Impacto:* es la función estrella del Assignment 2 y hoy le dice al comprador algo que no es cierto, con un verde y un rojo muy seguros. La tarea (b) termina en "no confiar".
- *Propuesta (estática; la decisión de especificación es del estudiante):*
  - (1) Agregar mínimo 4–5 propiedades por grupo comparable en `PROPERTIES`, o
  - (2) usar un precio/m² de referencia por zona y tipo como constante en `price-tags.js` (ej. `REFERENCIA = {"CDMX|departamento": …}`), con la fuente citada en la ficha, y
  - (3) exigir `numComparables >= 3` para mostrar etiqueta; si no se cumple, mostrar "Sin referencia suficiente".
  - Separar casa y depto en `grupo()`.
  - Ojo: esto cambia la especificación de 3 campos del estudiante, que la debe decidir y registrar en `PROMPT_LOG.md`.

**H3. No existe forma de volver a una propiedad ni de compartirla**
- *Evidencia:* `openModal(p)` solo cambia `innerHTML` y `hidden`, no toca `location`. No hay localStorage ni botón de compartir. El "Atrás" del navegador no cierra el modal.
- *Impacto:* la tarea (e) es imposible. En inmobiliaria, compartir con la pareja o la familia es el paso previo a contactar.
- *Propuesta:*
  - Al abrir la ficha: `history.pushState(null,"","#p-"+p.id)`. Al cargar y en `popstate`, leer `location.hash` y abrir o cerrar el modal. Esto arregla también el "Atrás".
  - Botón "Compartir" en `.modal-actions`: `navigator.share({title, url})` con fallback a `navigator.clipboard.writeText(url)` + aviso "Enlace copiado".
  - Botón ♡ "Guardar" en tarjeta y ficha con `localStorage` (`hf-favs`), más un filtro "Solo guardadas".
  - Serializar los filtros en la query (`?tipo=Departamento&max=6000000`) para que el estado de búsqueda también se pueda compartir.

### P1. Fricción fuerte

**H4. El menú ☰ en móvil no hace nada**
- *Evidencia:* `#menuToggle` no tiene listener en todo el JS. En ≤860px, `.nav-links` y "Agenda una visita" tienen `display:none`. Al tocarlo, `menu_visible_links=false` (`ux-mob-11-menu.png`, idéntica a `ux-mob-01-home.png`).
- *Impacto:* en móvil no hay navegación a Propiedades, Ubicaciones ni Contacto. El usuario tiene que hacer scroll hasta el final.
- *Propuesta:* un listener que alterne `aria-expanded` y una clase `.nav-open` que muestre `.nav-links` como panel desplegable. Cerrar al tocar un enlace.

**H5. Filtro de presupuesto: escalones mal elegidos, un bug y un estado vacío que no ayuda**
- *Evidencia:*
  - Las opciones son 3M/5M/8M; el depto de CDMX cuesta $5.2M, así que "Hasta $5M" da 0.
  - `<option value="999999999">Más de $8,000,000</option>` usa la misma regla `p.precio <= precioMax` y devuelve 8/8.
  - El estado vacío es solo texto (`empty.textContent = …`).
  - Hay error de plural: "1 propiedades encontradas".
  - En 390px el select se lee "Hasta $5,000,00".
- *Impacto:* la tarea (a) parece no tener resultado cuando sí lo tiene, y la (d) no ofrece salida.
- *Propuesta:*
  - Escalones 2/3/4/5/6/8 M con etiquetas cortas ("Hasta $6 M").
  - Para "Más de $8 M", un `data-min` y la regla `p.precio > 8e6`.
  - En el estado vacío: botón "Quitar filtros" + "La opción más cercana: Depto con vista panorámica, $5.2 M" (la propiedad con menor distancia a los filtros), + "Avísame por WhatsApp si llega algo así" con un mensaje prellenado con los filtros.
  - Corregir el plural.

**H6. La búsqueda ignora zona y dirección, y es sensible a acentos**
- *Evidencia:* el filtro busca solo `(p.titulo + " " + p.ubicacion)`. "queretaro" da 0, "Guadalajara" da 1 de 3 (las de Zapopan tienen `zona:"Guadalajara"` pero no aparecen) y "Ciudad de México" da 0.
- *Impacto:* son los falsos "sin resultados" más probables en México (escribir sin acentos y decir "Guadalajara" por la zona metropolitana).
- *Propuesta:* normalizar con `s.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase()`. Indexar `titulo, ubicacion, direccion, zona, tipo, amenidades` y sinónimos (`cdmx` ↔ `ciudad de mexico`, `depa`/`depto` ↔ `departamento`). Agregar un select "Zona" (CDMX / Guadalajara / Querétaro), que ya existe en los datos.

**H7. La explicación de la etiqueta no responde "¿contra qué?" ni "¿por qué 15%?"**
- *Evidencia:*
  - `priceAnalysisHTML` no menciona el umbral, no nombra el comparable y usa la flecha "→ -49%" sin decir "más barato que".
  - La tarjeta (`.price-tag`) no tiene `title` ni enlace a la explicación.
  - Para los terrenos, el `motivo` dice "Sin propiedades comparables en Guadalajara", aunque hay otras 2 propiedades en esa zona (no son terrenos).
- *Impacto:* aunque se arregle H2, sin explicación el usuario no puede decidir si confiar (tarea b).
- *Propuesta:* texto en la ficha del tipo: "**49% más barato por m²** que el promedio de 1 casa/depto comparable en CDMX (Depto con vista panorámica, Roma Norte: $53,061/m²). Marcamos 'Buena oportunidad' cuando está al menos 15% por debajo del promedio de la zona." Agregar un enlace "¿Cómo calculamos esto?" que abra un bloque fijo con las reglas y sus límites ("no considera antigüedad, amenidades ni colonia"). Para terrenos: "No hay otros terrenos en Guadalajara para comparar."

**H8. Las cifras de confianza son inventadas y se contradicen con el propio sitio**
- *Evidencia:*
  - `.stats`: "18 Propiedades activas" (hay **8**), "6 Zonas cubiertas" (el footer lista **3**), "4.9 Calificación promedio" sin fuente ni reseñas, "11 Años de experiencia".
  - El badge del hero dice "+120 familias instaladas".
  - Afirmaciones sin respaldo: "propiedades verificadas", "asesores certificados", "Verificamos cada escritura".
  - El disclaimer del footer las desmiente.
- *Impacto:* un comprador que cuenta 8 tarjetas deja de creer en todo lo demás, incluida la etiqueta de precio. Para un evaluador, son datos fabricados.
- *Propuesta:* calcular los números desde los datos (`PROPERTIES.length`, zonas únicas, "6 con análisis de precio") y quitar 4.9, +120 y 11 años mientras no haya una fuente. Si se quiere prueba social, que sea verificable (por ejemplo un testimonio con nombre y fecha, o nada).

**H9. El formulario no está conectado a la ficha y no da retroalimentación**
- *Evidencia:*
  - `#cPhone` es `type="text"` sin `pattern` (acepta "abc").
  - Los mensajes de validación salen en inglés (`<html>` sin `lang`).
  - El submit hace `window.open(...)` sin aviso en la página.
  - `cInterest` solo manda el título (sin precio ni colonia).
  - La ficha no tiene CTA hacia el formulario.
  - El header promete "Agenda una visita", pero el formulario no pide fecha.
  - En móvil el FAB verde tapa la nota del formulario (`ux-mob-09-c-form.png`; FAB y=770–826).
- *Impacto:* el contacto "formal" se siente roto y no deja registro de lo enviado.
- *Propuesta:*
  - `<html lang="es">`, `type="tel" inputmode="tel" pattern="[0-9 +()-]{10,}"` y un mensaje propio con `setCustomValidity("Escribe un teléfono de 10 dígitos")`.
  - En la ficha, un botón "Agendar visita" que cierre el modal, haga `cInterest.value = p.titulo`, scroll a `#contacto` y foco en `#cName`.
  - Campo opcional "¿Cuándo te gustaría visitarla?".
  - Después del submit, un mensaje inline: "Abrimos WhatsApp con tu mensaje. Si no se abrió, toca aquí" (con el enlace).
  - Ocultar el FAB cuando `#contacto` está en viewport (IntersectionObserver).

**H10. Todas las propiedades usan el mismo dibujo, incluidos los terrenos**
- *Evidencia:* `houseArt(seed)` dibuja la misma casa con otra paleta para todas: el terreno de Zapopan y el loft de Querétaro tienen una casa de dos aguas (`ux-desk-04-b-cards.png`). La tarjeta muestra `p.m2 || p.terreno` sin decir de qué m² se trata, y las casas ocultan su `terreno`.
- *Impacto:* no se puede evaluar una propiedad sin fotos. Es la carencia que más aleja al sitio de "producto inmobiliario completo".
- *Propuesta:* carpeta `/img/p-1/*.jpg` (fotos libres de Unsplash o propias) con galería simple (`scroll-snap`) en la ficha. Mientras no haya fotos, usar un dibujo distinto para Terreno (lote con cerca) y Departamento (edificio). En la tarjeta, mostrar "180 m² constr. · 210 m² terreno" y el precio/m².

**H11. El modal no se comporta como diálogo**
- *Evidencia:* `#modalCard` sin `role="dialog"`/`aria-modal`. El foco se queda en la tarjeta de fondo (`active_el = ARTICLE.card`). `body` sigue con `overflow: visible` (el fondo hace scroll). En móvil la ✕ no es sticky y se pierde al hacer scroll (`ux-mob-06-b-modal-scroll.png`).
- *Impacto:* hay desorientación en móvil, y con teclado o lector de pantalla no se sabe que se abrió una ficha.
- *Propuesta:* migrar a `<dialog>` nativo (`showModal()` da foco atrapado, Esc y backdrop gratis). Agregar `body{overflow:hidden}` mientras esté abierto, `.modal-close{position:sticky}` y devolver el foco a la tarjeta al cerrar. Combinar con el hash de H3.

### P2. Pulido

**H12. Casos límite de la función de etiquetas**
- *Evidencia (`node /home/claude/uxscripts/edge.js`, datos sintéticos):*
  - Ratio 0.854 muestra **"-15%" con "Precio en rango"**, y ratio 1.146 muestra "+15%" con "Precio en rango", porque `Math.round` redondea el porcentaje mostrado pero el umbral compara el ratio crudo.
  - Una casa con `m2:0` y `terreno:200` da "Sin superficie o precio válido" (jerga técnica), mientras la tarjeta muestra "200 m²" y la ficha "200 m² terreno" para una Casa.
  - `zona:"cdmx"` vs `"CDMX"` crean grupos distintos.
  - `m2:"100"` (string) sí calcula, por coerción.
- *Impacto:* poco frecuente con los datos actuales, pero un "-15% en rango" en pantalla parece un error ante el evaluador.
- *Propuesta:* decidir la regla sobre el valor mostrado (`diferenciaPct <= -15`) o mostrar un decimal. Normalizar `zona` con `trim().toUpperCase()` en `grupo()`. Cambiar el `motivo` a lenguaje de usuario ("Falta la superficie construida para calcular"). Agregar estos 4 casos a `test.js`.

**H13. Estados de la propiedad confusos ("Apartada", "Nueva")**
- *Evidencia:* `estado` mezcla disponibilidad ("En venta", "Apartada") con condición ("Nueva"). El loft "Apartada" aparece igual que el resto y su CTA pide "¿Podemos agendar una visita?".
- *Impacto:* el comprador pierde tiempo en algo que no está disponible.
- *Propuesta:* separar en `disponibilidad` y `condicion`. Las "Apartada" van al final, atenuadas, con el CTA "Avísame si se libera".

**H14. El mapa es decorativo y su texto promete otra cosa**
- *Evidencia:* `pos:{x,y}` inventados ponen CDMX, Guadalajara y Querétaro en un mismo lienzo. El texto dice "o ábrelo directo en Google Maps", pero el pin solo abre la ficha. `btn.title` no funciona en touch y los pines no tienen `aria-label`.
- *Impacto:* desorienta y no aporta ubicación real.
- *Propuesta:* tres mini mapas o pestañas por zona, o una lista agrupada por ciudad con enlace a Maps. Agregar `aria-label` a los pines y corregir el texto.

**H15. Texto y detalles de tono en español**
- *Evidencia:*
  - "Curamos propiedades" (calco del inglés).
  - "1 propiedades".
  - El enlace de WhatsApp en `#contacto` usa un icono de corazón.
  - "PRECIO ALTO" en rojo `--danger` sobre la propia oferta de la inmobiliaria (es contraproducente comercialmente).
  - La marca se parte en "Home / Finder" a 390px.
  - Hay un botón WhatsApp en el header y otro FAB, duplicados en móvil.
  - Falta `<meta name="description">`/Open Graph, así que el enlace compartido no tendrá vista previa.
- *Propuesta:*
  - "Seleccionamos propiedades…".
  - Plural condicional.
  - Icono de WhatsApp.
  - "Arriba del promedio de la zona" en tono neutro (gris o ámbar).
  - `white-space:nowrap` en `.brand`.
  - Quitar el WhatsApp del header en móvil.
  - Agregar OG tags (`og:title`, `og:description`, `og:image`).

---

## Lo que está bien y hay que conservar

1. **Los mensajes de WhatsApp prellenados por propiedad** (`waMsg` con título, colonia y precio, bien codificados con `encodeURIComponent`). Ahorran trabajo al usuario y al asesor. Hay que conservarlos y extender el mismo patrón al estado vacío y a "Agendar visita".
2. **Los filtros reaccionan al instante** (`input`/`change` → `renderGrid`), con contador de resultados y botón "Limpiar". Es la base correcta.
3. **La ficha muestra el cálculo con números** (precio/m², promedio, n.º de comparables). Es el embrión correcto de transparencia para la etiqueta; solo falta completarlo (H7).
4. **`price-tags.js` está aislado, sin dependencias y probado con `node test.js`**, con leave-one-out y terrenos separados. Es fácil de corregir y explicar para el curso.
5. **El diseño visual y responsive es sólido**: tarjetas legibles, la ficha cabe en 390px sin desbordes, hay modo oscuro, foco visible, tarjetas operables con Enter/Espacio y cierre con Esc. Todo es 100% estático y listo para Vercel.
