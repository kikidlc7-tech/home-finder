const test = require("node:test");
const assert = require("node:assert/strict");
const F = require("../js/finance.js");

test("pago mensual: 1,000,000 al 12 % anual a 1 año = 88,848.79", () => {
  assert.equal(F.pagoMensual(1_000_000, 12, 1).toFixed(2), "88848.79");
});
test("tasa 0 %: divide el crédito entre los meses", () => {
  assert.equal(F.pagoMensual(120_000, 0, 10), 1000);
});
test("costo mensual suma hipoteca y gastos de comunidad", () => {
  const c = F.costoMensual({ precio: 1_000_000, enganchePct: 30, tasaAnualPct: 3.5, anios: 20, gastos: 500 });
  assert.equal(c.credito, 700_000);
  assert.ok(Math.abs(c.total - (c.hipoteca + 500)) < 1e-9);
});
test("convertir EUR a MXN/USD", () => {
  const t = { EUR_MXN: 20, EUR_USD: 1.1 };
  assert.equal(F.convertir(10, "MXN", t), 200);
  assert.equal(F.convertir(10, "EUR", t), 10);
  assert.ok(Math.abs(F.convertir(10, "USD", t) - 11) < 1e-9);
});
