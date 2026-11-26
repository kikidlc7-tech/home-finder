/* =========================================================
   Home Finder — cálculos financieros (sin dependencias)
   - pagoMensual: amortización francesa (pago fijo)
   - costoMensual: hipoteca + gastos de comunidad
   - convertir: EUR -> MXN / USD con un tipo de cambio dado
   ========================================================= */
(function (root) {
  "use strict";

  function pagoMensual(monto, tasaAnualPct, anios) {
    var n = Math.round(anios * 12);
    if (!(monto > 0) || !(n > 0)) return 0;
    var r = tasaAnualPct / 100 / 12;
    if (!(r > 0)) return monto / n;
    return monto * r / (1 - Math.pow(1 + r, -n));
  }

  function costoMensual(o) {
    var enganche = o.precio * (o.enganchePct / 100);
    var credito = Math.max(0, o.precio - enganche);
    var hipoteca = pagoMensual(credito, o.tasaAnualPct, o.anios);
    var gastos = o.gastos || 0;
    var totalPagado = hipoteca * o.anios * 12;
    return {
      enganche: enganche,
      credito: credito,
      hipoteca: hipoteca,
      gastos: gastos,
      total: hipoteca + gastos,
      intereses: Math.max(0, totalPagado - credito)
    };
  }

  function convertir(eur, moneda, tasas) {
    if (moneda === "EUR") return eur;
    var t = moneda === "USD" ? tasas.EUR_USD : tasas.EUR_MXN;
    return eur * t;
  }

  var api = { pagoMensual: pagoMensual, costoMensual: costoMensual, convertir: convertir };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Finance = api;
})(this);
