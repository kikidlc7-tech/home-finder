# Trabajar Azur con Claude Code

## 1. Entrar a Claude Code (después de instalarlo)
1. Abre **Terminal** (Cmd + Espacio → "Terminal").
2. Comprueba la instalación: `claude --version` (debe imprimir un número de versión).
3. Ve a la carpeta del proyecto y arranca:
   ```bash
   cd ~/Documents/home-finder
   claude
   ```
4. La primera vez te pide iniciar sesión en el navegador con tu cuenta de Claude. Después ya no.
5. Dentro: escribe lo que quieres en español. `Shift+Tab` cambia el modo de permisos (por ejemplo, aceptar ediciones automáticamente). `/help` muestra comandos y `/exit` sale.

Claude Code lee `CLAUDE.md` al arrancar, así que ya conoce el proyecto y las reglas del curso.

## 2. Bajar el código (si el repo ya está en GitHub)
```bash
cd ~/Documents
git clone https://github.com/kikidlc7-tech/home-finder.git
cd home-finder
claude
```

**Si el repo todavía está vacío**, descomprime `home-finder.zip` (trae el historial de git con los commits A1 → A2 → A3) y pídele a Claude Code:
> Este repo ya tiene historial. Agrega el remoto https://github.com/kikidlc7-tech/home-finder.git y haz push de main y de los tags. Si pide iniciar sesión en GitHub, usa `gh auth login`.

## 3. Prompts para pegar en Claude Code
**Verificar que todo funciona**
> Corre `node --test tests/*.test.js` y `node tests/verificar-fotos.mjs`. Si alguna foto falla, propón un reemplazo de unsplash.com con el mismo tipo de espacio, muéstrame cuál y espera mi OK antes de cambiar `data/propiedades.json`.

**Desplegar en Vercel por terminal** (alternativa a Claude in Chrome)
> Despliega esta carpeta en Vercel como sitio estático con `npx vercel` (framework Other, sin build). Primero corre `npx vercel login` y espera a que yo inicie sesión. Luego `npx vercel --prod`, dame la URL de producción y confirma con curl que responde 200 y que trae el header Content-Security-Policy.

**Registrar un rechazo** (la mejor evidencia para el nivel 4–5)
> No acepto [X] porque [mi razón]. Reviértelo con un commit cuyo mensaje explique mi decisión, y agrega la fila correspondiente en PROMPT_LOG.md con veredicto "Rechazar" y mi razón tal cual la escribí.

**Probar en el deploy**
> Abre la URL de producción con curl en `/data/propiedades.json` y `/#propiedad-13` y dime si responden. Luego corre `node tests/validacion.js 13` y muéstrame la salida completa para pegarla en el Paso 3.
