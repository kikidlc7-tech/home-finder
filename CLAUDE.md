# Azur (antes Home Finder) — contexto para Claude Code

Sitio estático (HTML/CSS/JS sin framework ni build) desplegado en Vercel. Ver `README.md` para estructura y funciones.

## Comandos
- Servidor local: `python3 -m http.server 8000`
- Pruebas: `node --test tests/*.test.js`
- Validación de una propiedad: `node tests/validacion.js <id>`
- Fotos: `node tests/verificar-fotos.mjs` (si alguna falla, cámbiala por otra foto gratuita de unsplash.com y actualiza `id`, `autor` y `alt` en `data/propiedades.json`)

## Reglas del proyecto
- Todo texto que venga de datos se inserta con `esc()` (ver `js/app.js`). No agregues `onclick` ni scripts inline: la CSP de `vercel.json` los bloquea.
- Si agregas un dominio externo (imágenes, API), actualiza la CSP en `vercel.json`.
- La lógica de etiquetas vive en `js/price-tags.js` y debe seguir pasando las pruebas.
- Mensajes de commit en español que expliquen la **decisión** y su motivo, no solo "update" o "fix".

## Reglas del curso (Applied Algorithmic Thinking)
La especificación de 3 campos, los veredictos Aceptar/Rechazar/Revisar con sus razones, el output real de las pruebas en `PROMPT_LOG.md`, las entradas "Qué decidí / Por qué" del README y la autoevaluación **los escribe el alumno**. No los redactes. Si propones algo que se sale de su especificación (otra fuente de datos, funciones extra), avísale para que lo decida y lo registre.
