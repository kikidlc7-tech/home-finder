// Verifica que cada foto de Unsplash responda (correr en una máquina con internet): node tests/verificar-fotos.mjs
import { readFile } from "node:fs/promises";
const data = JSON.parse(await readFile(new URL("../data/propiedades.json", import.meta.url)));
let malas = 0, total = 0;
for (const p of data.propiedades) for (const f of p.fotos) {
  total++;
  const url = `https://images.unsplash.com/photo-${f.id}?auto=format&fit=crop&w=200&q=50`;
  try {
    const r = await fetch(url, { method: "HEAD" });
    if (!r.ok) { malas++; console.log(`FALLA ${r.status}  propiedad #${p.id}  ${f.id}  (${f.alt})`); }
  } catch (e) { malas++; console.log(`ERROR propiedad #${p.id} ${f.id}: ${e.message}`); }
}
console.log(`${total - malas}/${total} fotos responden.`);
process.exit(malas ? 1 : 0);
