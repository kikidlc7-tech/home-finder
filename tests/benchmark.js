// Compara la versión O(n²) del Assignment 2 con la O(n) actual. Uso: node tests/benchmark.js
const nueva = require("../js/price-tags.js");
const vieja = require("./price-tags-v1-o-n2.js");
const gen = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1, zona: "Z" + (i % 5), tipo: "Casa", precio: 1e6 + ((i * 7919) % 9e6), m2: 100 + (i % 500), terreno: 0 }));
const t = (fn) => { const a = process.hrtime.bigint(); fn(); return Number(process.hrtime.bigint() - a) / 1e6; };
console.log("n\tO(n²) ms\tO(n) ms");
for (const n of [100, 1000, 10000, 20000]) {
  const ps = gen(n);
  const v = n <= 20000 ? t(() => vieja.calcularEtiquetasPrecio(ps)).toFixed(1) : "-";
  console.log(`${n}\t${v}\t\t${t(() => nueva.calcularEtiquetasPrecio(ps)).toFixed(1)}`);
}
