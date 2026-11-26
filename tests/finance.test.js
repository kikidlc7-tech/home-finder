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

test("renta: tarifa por noche = valor × tasa mensual ÷ 30", () => {
  assert.equal(F.tarifaNoche(3_000_000, "media"), 4000);   // 3M × 4 % / 30
  assert.equal(F.tarifaNoche(3_000_000, "alta"), 6000);    // 6 %
  assert.equal(F.tarifaNoche(3_000_000, "baja"), 3000);    // 3 %
});
test("renta: temporadas por mes", () => {
  assert.equal(F.temporadaDe(new Date(Date.UTC(2027, 6, 15))), "alta");  // julio
  assert.equal(F.temporadaDe(new Date(Date.UTC(2027, 4, 15))), "media"); // mayo
  assert.equal(F.temporadaDe(new Date(Date.UTC(2027, 0, 15))), "baja");  // enero
});
test("renta: mínimo 5 noches", () => {
  const r = F.cotizar(3_000_000, "2027-07-01", "2027-07-05");
  assert.equal(r.ok, false);
  assert.equal(r.noches, 4);
  assert.match(r.error, /mínima es de 5/);
});
test("renta: estancia que cruza de temporada media a alta se cobra noche por noche", () => {
  const r = F.cotizar(3_000_000, "2027-05-29", "2027-06-04"); // 29, 30, 31 mayo + 1, 2, 3 junio
  assert.equal(r.ok, true);
  assert.equal(r.noches, 6);
  assert.equal(r.desglose.media.noches, 3);
  assert.equal(r.desglose.alta.noches, 3);
  assert.equal(r.total, 3 * 4000 + 3 * 6000);
});
test("renta: fechas inválidas o salida antes de llegada", () => {
  assert.equal(F.cotizar(1, "", "2027-01-10").ok, false);
  assert.equal(F.cotizar(1, "2027-02-30", "2027-03-10").ok, false);
  assert.equal(F.cotizar(1, "2027-01-10", "2027-01-05").ok, false);
});
