// Imprime la etiqueta calculada de cada propiedad, lista para copiar al registro de validación (Paso 3).
// Uso: node tests/validacion.js            -> todas
//      node tests/validacion.js 13         -> solo la propiedad 13, con sus comparables
const T = require("../js/price-tags.js");
const data = require("../data/propiedades.json").propiedades;
const r = T.calcularEtiquetasPrecio(data);
const id = Number(process.argv[2]);
const eur = (n) => "€" + Math.round(n).toLocaleString("es-MX");
const lista = id ? data.filter((p) => p.id === id) : data;
for (const p of lista) {
  const e = r[p.id];
  console.log(`#${p.id} ${p.titulo} | zona=${p.zona} | tipo=${p.tipo} | precio=${eur(p.precio)} | sup=${p.tipo === "Terreno" ? p.terreno : p.m2} m² | ${eur(e.precioM2)}/m² | promedio comparables=${e.promedioComparables ? eur(e.promedioComparables) + "/m²" : "-"} (n=${e.numComparables}) | dif=${e.diferenciaPct ?? "-"} % | ${e.etiqueta || "sin etiqueta: " + e.motivo}`);
  if (id) for (const c of T.comparablesDe(p, data)) console.log(`   comparable #${c.id} ${c.titulo}: ${eur(T.precioM2(c))}/m²`);
}
