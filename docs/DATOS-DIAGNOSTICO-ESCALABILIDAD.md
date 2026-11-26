# Datos para tu diagnóstico de escalabilidad (S22)

> Este documento te da **números reales de tu proyecto** y **límites oficiales** consultados el 26-nov-2026. El diagnóstico (cuál es la restricción real y qué decides) lo escribes tú.

## 1. Lo que pesa tu app (medido en este repo)

| Archivo | Bytes | Gzip |
|---|---:|---:|
| index.html | 15,969 | 4,640 |
| css/styles.css | 38,496 | 8,513 |
| js/app.js | 55,911 | 16,754 |
| js/price-tags.js | 3,747 | 1,481 |
| js/finance.js | 1,505 | 661 |
| data/propiedades.json (17 propiedades) | 30,733 | 7,738 |
| **Carga inicial de código y datos (sin mapa)** | | **≈ 39.8 KB** |
| vendor/leaflet (js + css, solo al abrir el mapa) | 162,369 | 45,900 |

- **Peticiones a Vercel en una primera visita:** 6 (html, css, 3 js, json), más 2 si abre el mapa (Leaflet js + css). Fotos, teselas, tipografías y tipo de cambio **no** salen de Vercel.
- **Datos por propiedad:** ≈ 1.8 KB (≈ 455 B gzip). Con 10,000 propiedades el JSON pesaría ≈ 18 MB (≈ 4.5 MB gzip) y se descargaría completo en cada visita.

## 2. Algoritmo de etiquetas (benchmark en este repo: `node tests/benchmark.js`)

| Propiedades | Versión A2 (O(n²)) | Versión actual (O(n)) |
|---:|---:|---:|
| 100 | 6.6 ms | 0.9 ms |
| 1,000 | 106 ms | 1.2 ms |
| 10,000 | 9,144 ms | 6.9 ms |
| 20,000 | 37,334 ms | 11.8 ms |

(El auditor 3 midió lo mismo de forma independiente: 4,967 ms con 10,000 y 129 s con 50,000 en la versión O(n²).)

## 3. Dependencias externas, límites y costo

| Dependencia | Para qué | Límite / costo (fuente oficial) |
|---|---|---|
| **Vercel Hobby** | Hospeda el sitio | Gratis. Incluye 100 GB/mes de *Fast Data Transfer* y 1,000,000 de *CDN Requests*. Si te pasas en Hobby, en la mayoría de los casos esperas 30 días para volver a usar la función. — vercel.com/docs/plans/hobby |
| **Unsplash** (images.unsplash.com) | 90 fotos | Licencia Unsplash (uso gratuito). Las fotos no cuentan en el tráfico de Vercel. |
| **Teselas de OpenStreetMap** | Mapa | Sin SLA ("best-effort"). Exige atribución visible y un Referer válido. Prohíbe descargas masivas, prefetch y uso offline; no publica un límite numérico de peticiones. — operations.osmfoundation.org/policies/tiles |
| **Frankfurter** (tipo de cambio) | MXN/USD | Sin API key, sin cuotas mensuales ni diarias, pero "rate-limited to prevent abuse". La app guarda el tipo de cambio 12 h por navegador y tiene respaldo. — frankfurter.dev |
| **Google Fonts** | Tipografías | Gratis; si falla, se usan las fuentes del sistema. |

## 4. Cuentas rápidas que puedes usar (verifícalas tú)
- **CDN Requests:** 1,000,000 / 6 a 8 peticiones por primera visita ≈ **125,000 a 165,000 visitas nuevas al mes** antes del tope de Hobby (las visitas que regresan usan caché).
- **Transferencia:** 100 GB / ~40–86 KB por visita ≈ **más de 1 millón de visitas**. No es el primer límite.
- **Catálogo:** el JSON completo y el render en el navegador son el cuello de botella antes de las 10,000 propiedades. Lo siguiente sería paginar desde una API o base de datos.
- **Mapa:** con tráfico alto, las teselas de OSM dejan de ser adecuadas (política de uso) → proveedor de teselas con plan de pago o teselas propias.

## 5. Preguntas para tu decisión
1. Con tu número de usuarios objetivo, ¿cuál de estos límites tocas primero?
2. ¿Qué decides hacer distinto *hoy* por ese límite, y qué dejas documentado para después?
3. ¿Qué número de tu propio proyecto usas como evidencia?
