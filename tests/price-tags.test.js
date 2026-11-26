// node --test tests/
const test = require("node:test");
const assert = require("node:assert/strict");
const T = require("../js/price-tags.js");
const data = require("../data/propiedades.json").propiedades;

const casa = (id, zona, precio, m2) => ({ id, zona, tipo: "Casa", precio, m2, terreno: 0 });

test("compara contra el promedio de las OTRAS propiedades (leave-one-out)", () => {
  const r = T.calcularEtiquetasPrecio([casa(1, "A", 1000, 10), casa(2, "A", 2000, 10), casa(3, "A", 3000, 10)]);
  assert.equal(r[1].promedioComparables, 250);          // (200 + 300) / 2
  assert.equal(r[1].diferenciaPct, -60);
  assert.equal(r[1].etiqueta, "Buena oportunidad");
  assert.equal(r[3].etiqueta, "Precio alto");
  assert.equal(r[2].etiqueta, "Precio en rango");
});

test("la etiqueta usa el mismo % redondeado que ve el usuario (caso límite -14.6 %)", () => {
  // ratio 0.854 -> -14.6 % se muestra como -15 % y debe decir "Buena oportunidad"
  const r = T.calcularEtiquetasPrecio([casa(1, "A", 854, 1), casa(2, "A", 1000, 1)]);
  assert.equal(r[1].diferenciaPct, -15);
  assert.equal(r[1].etiqueta, "Buena oportunidad");
});

test("+14.4 % se queda en rango", () => {
  const r = T.calcularEtiquetasPrecio([casa(1, "A", 1144, 1), casa(2, "A", 1000, 1)]);
  assert.equal(r[1].diferenciaPct, 14);
  assert.equal(r[1].etiqueta, "Precio en rango");
});

test("terrenos se comparan solo con terrenos y por m² de terreno", () => {
  const t = (id, precio, terreno) => ({ id, zona: "A", tipo: "Terreno", precio, m2: 0, terreno });
  const r = T.calcularEtiquetasPrecio([t(1, 100, 10), t(2, 200, 10), casa(3, "A", 999999, 1)]);
  assert.equal(r[1].numComparables, 1);
  assert.equal(r[3].etiqueta, null);
  assert.match(r[3].motivo, /para comparar/);
});

test("la zona no distingue mayúsculas ni acentos", () => {
  const r = T.calcularEtiquetasPrecio([casa(1, "Èze", 100, 1), casa(2, "eze", 100, 1)]);
  assert.equal(r[1].numComparables, 1);
});

test("sin superficie o sin precio no truena: sin etiqueta y con motivo", () => {
  const r = T.calcularEtiquetasPrecio([casa(1, "A", 100, 0), casa(2, "A", 0, 10), casa(3, "A", 100, 10)]);
  assert.equal(r[1].etiqueta, null);
  assert.equal(r[2].etiqueta, null);
  assert.equal(r[3].numComparables, 0);
});

test("el catálogo real: todas las propiedades tienen etiqueta (zona con 2+ villas)", () => {
  const r = T.calcularEtiquetasPrecio(data);
  assert.equal(data.filter((p) => !r[p.id].etiqueta).length, 0);
});

test("la versión O(n) da el mismo resultado que la versión O(n²) del Assignment 2 en 2,000 propiedades sintéticas", () => {
  const vieja = require("./price-tags-v1-o-n2.js");
  const zonas = ["A", "B", "C", "D"];
  const ps = Array.from({ length: 2000 }, (_, i) => ({
    id: i + 1, zona: zonas[i % 4], tipo: i % 10 === 0 ? "Terreno" : "Casa",
    precio: 1e6 + ((i * 7919) % 5e6), m2: 100 + (i % 300), terreno: 200 + (i % 900)
  }));
  const a = T.calcularEtiquetasPrecio(ps), b = vieja.calcularEtiquetasPrecio(ps);
  let distintas = 0;
  for (const p of ps) {
    // la v1 clasificaba con el ratio sin redondear; solo pueden diferir en el borde de ±15 %
    if (a[p.id].etiqueta !== b[p.id].etiqueta && Math.abs(Math.abs(a[p.id].diferenciaPct) - 15) > 1) distintas++;
    assert.ok(Math.abs(a[p.id].promedioComparables - b[p.id].promedioComparables) < 1e-6);
  }
  assert.equal(distintas, 0);
});
