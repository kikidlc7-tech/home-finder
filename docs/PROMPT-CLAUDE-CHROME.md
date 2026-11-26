# Prompt para Claude in Chrome — deploy y verificación en Vercel

> Ajustes de permisos: el modo y los permisos por sitio se cambian en la extensión (íconos de Claude → ⋯ → Extension settings). Aun con permisos amplios, la extensión pide tu aprobación para cosas sensibles, como dar autorizaciones o escribir datos sensibles; los inicios de sesión los haces tú.

```
Eres mi asistente de despliegue. Trabaja de corrido y no me preguntes por pasos rutinarios. Detente solo si necesito iniciar sesión, escribir una contraseña o un código 2FA (eso lo hago yo), o si algo te bloquea dos veces seguidas. Mi cuenta de GitHub es kikidlc7-tech y el repo es github.com/kikidlc7-tech/home-finder.

1. Abre github.com/kikidlc7-tech/home-finder y confirma que ya tiene index.html, vercel.json y la carpeta data/. Si está vacío, para y avísame.
2. En vercel.com → Add New… → Project, importa "home-finder" con: Framework Preset "Other", Root Directory "./", sin Build Command, sin Output Directory. Deploy.
3. Abre la URL de producción (.vercel.app) y verifica, anotando ✅ o ❌ y qué viste:
   a) La landing carga con foto de fondo y el título "La Costa Azul, con el precio en contexto."
   b) En "Propiedades", las tarjetas tienen fotos, precio y una etiqueta (Buena oportunidad / En rango / Precio alto).
   c) El mapa de la derecha carga con pines de precio y al hacer clic en un pin aparece la tarjetita con "Ver ficha".
   d) Filtro Zona → "Cannes" deja 3 propiedades; "Precio vs. zona" → "Buena oportunidad" deja 1.
   e) Abre /#propiedad-13: aparece "¿El precio es razonable?" con "Buena oportunidad (-15 %)" y 2 comparables.
   f) Cambia la moneda a EUR y luego a USD: los precios cambian. Lee el pie de página y dime qué tipo de cambio y qué fecha muestra.
   g) Reduce la ventana a ancho de celular: aparece el botón "Mapa" abajo y el menú ☰ funciona.
   h) Abre las herramientas de desarrollador → Consola: ¿hay errores en rojo? Copia el texto exacto si los hay.
   i) Pestaña Network, recarga sin caché: anota cuántas peticiones y cuántos KB transferidos muestra abajo (es un dato para mi diagnóstico de escalabilidad).
4. En Vercel → Settings → Deployment Protection, confirma que la URL de producción sea pública, sin login.
5. Entrégame: URL de producción, URL del repo, URL de PROMPT_LOG.md en GitHub y la lista del paso 3.
```
