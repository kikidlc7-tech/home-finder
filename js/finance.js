/* =========================================================
   Azur — cálculos de dinero (sin dependencias)
   - Renta: tarifa por noche según temporada y cotización de una estancia
   - convertir: EUR -> MXN / USD
   - pagoMensual: amortización (se conserva por compatibilidad con pruebas)
   ========================================================= */
(function (root) {
  "use strict";

  var RENTA_DEFAULT = {
    tasasMensuales: { alta: 0.06, media: 0.04, baja: 0.03 },
    temporadas: { alta: [6, 7, 8, 9], media: [4, 5, 10], baja: [11, 12, 1, 2, 3] },
    diasPorMes: 30,
    minNoches: 5
  };

  function temporadaDe(fecha, cfg) {
    cfg = cfg || RENTA_DEFAULT;
    var mes = fecha.getUTCMonth() + 1;
    if (cfg.temporadas.alta.indexOf(mes) > -1) return "alta";
    if (cfg.temporadas.media.indexOf(mes) > -1) return "media";
    return "baja";
  }

  // tarifa por noche = valor × tasa mensual de la temporada ÷ días por mes
  function tarifaNoche(valor, temporada, cfg) {
    cfg = cfg || RENTA_DEFAULT;
    return valor * cfg.tasasMensuales[temporada] / cfg.diasPorMes;
  }

  function parseISO(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
    if (!m) return null;
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCMonth() === +m[2] - 1 ? d : null;
  }

  // Cotiza noche por noche: cada noche toma la temporada de su fecha.
  function cotizar(valor, llegada, salida, cfg) {
    cfg = cfg || RENTA_DEFAULT;
    var a = parseISO(llegada), b = parseISO(salida);
    if (!a || !b) return { ok: false, error: "Elige fecha de llegada y de salida." };
    var noches = Math.round((b - a) / 864e5);
    if (noches <= 0) return { ok: false, error: "La salida debe ser después de la llegada." };
    if (noches < cfg.minNoches) return { ok: false, noches: noches, error: "La estancia mínima es de " + cfg.minNoches + " noches." };
    var desglose = { alta: { noches: 0, tarifa: tarifaNoche(valor, "alta", cfg) }, media: { noches: 0, tarifa: tarifaNoche(valor, "media", cfg) }, baja: { noches: 0, tarifa: tarifaNoche(valor, "baja", cfg) } };
    for (var i = 0; i < noches; i++) {
      var d = new Date(a.getTime() + i * 864e5);
      desglose[temporadaDe(d, cfg)].noches++;
    }
    var total = 0;
    Object.keys(desglose).forEach(function (k) { desglose[k].subtotal = desglose[k].noches * desglose[k].tarifa; total += desglose[k].subtotal; });
    return { ok: true, noches: noches, desglose: desglose, total: total };
  }

  function convertir(eur, moneda, tasas) {
    if (moneda === "EUR") return eur;
    return eur * (moneda === "USD" ? tasas.EUR_USD : tasas.EUR_MXN);
  }

  function pagoMensual(monto, tasaAnualPct, anios) {
    var n = Math.round(anios * 12);
    if (!(monto > 0) || !(n > 0)) return 0;
    var r = tasaAnualPct / 100 / 12;
    if (!(r > 0)) return monto / n;
    return monto * r / (1 - Math.pow(1 + r, -n));
  }
  function costoMensual(o) {
    var enganche = o.precio * (o.enganchePct / 100), credito = Math.max(0, o.precio - enganche);
    var hipoteca = pagoMensual(credito, o.tasaAnualPct, o.anios), gastos = o.gastos || 0;
    return { enganche: enganche, credito: credito, hipoteca: hipoteca, gastos: gastos, total: hipoteca + gastos, intereses: Math.max(0, hipoteca * o.anios * 12 - credito) };
  }

  var api = { RENTA_DEFAULT: RENTA_DEFAULT, temporadaDe: temporadaDe, tarifaNoche: tarifaNoche, cotizar: cotizar, parseISO: parseISO, convertir: convertir, pagoMensual: pagoMensual, costoMensual: costoMensual };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Finance = api;
})(this);
