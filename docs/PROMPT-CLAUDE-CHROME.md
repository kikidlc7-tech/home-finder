# Prompt para Claude in Chrome — deploy y verificación en Vercel

> Ajustes de permisos: el modo y los permisos por sitio se cambian en la extensión (íconos de Claude → ⋯ → Extension settings). Aun con permisos amplios, la extensión pide tu aprobación para cosas sensibles, como dar autorizaciones o escribir datos sensibles; los inicios de sesión los haces tú.

```
Eres mi asistente de despliegue. Trabaja de corrido y no me preguntes por pasos rutinarios. Detente solo si necesito iniciar sesión, escribir una contraseña o un código 2FA (eso lo hago yo), o si algo te bloquea dos veces seguidas. Mi cuenta de GitHub es kikidlc7-tech y el repo es github.com/kikidlc7-tech/home-finder.

1. Abre github.com/kikidlc7-tech/home-finder y confirma que ya tiene index.html, vercel.json y la carpeta data/. Si está vacío, para y avísame.
2. En vercel.com → Add New… → Project, importa "home-finder" con: Framework Preset "Other", Root Directory "./", sin Build Command, sin Output Directory. Deploy.
3. Abre la URL de producción (.vercel.app) y verifica, anotando ✅ o ❌ y qué viste:
   a) Arriba aparece la marca AZUR y una foto grande de la villa destacada.
   b) Las villas se ven con fotos grandes, "Desde $… por noche" y una nota como "Buena oportunidad · 30 % bajo su zona".
   c) Botón "Mapa": se ve un mapa real con 5 zonas; al tocar una se acercan sus villas y, al pasar el mouse por un pin, aparece la tarjeta de la casa.
   d) Abre /#propiedad-2, elige llegada 29-may-2027 y salida 04-jun-2027: debe cotizar 6 noches (3 en temporada media y 3 en alta). Con 4 noches debe decir que el mínimo es 5.
   e) Cambia la moneda a EUR y USD: cambian las tarifas.
   f) En ancho de celular se ve ordenado.
   g) Consola (herramientas de desarrollador): ¿errores en rojo? Copia el texto exacto.
4. En Vercel → Settings → Deployment Protection, confirma que la URL de producción sea pública, sin login.
5. Entrégame: URL de producción, URL del repo, URL de PROMPT_LOG.md en GitHub y la lista del paso 3.
```
