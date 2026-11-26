/* =========================================================
   Home Finder — Etiquetas automáticas de precio
   Compara el precio por m² de cada propiedad contra el
   promedio de las propiedades COMPARABLES:
     - misma zona metropolitana (campo `zona`)
     - mismo tipo de superficie (construcción vs. terreno)
     - excluyendo a la propia propiedad (leave-one-out)
   Reglas:
     ratio <= 0.85  -> "Buena oportunidad"
     ratio >= 1.15  -> "Precio alto"
     en medio       -> "Precio en rango"
     sin comparables o sin m² -> sin etiqueta (null)
   ========================================================= */
(function (root) {
  "use strict";

  var UMBRAL_BAJO = 0.85;
  var UMBRAL_ALTO = 1.15;

  // Terrenos se miden por m² de terreno; casas/deptos por m² construidos.
  function superficie(p) {
    return p.tipo === "Terreno" ? p.terreno : p.m2;
  }

  function grupo(p) {
    return p.zona + "|" + (p.tipo === "Terreno" ? "terreno" : "construccion");
  }

  function precioM2(p) {
    var s = superficie(p);
    if (!s || s <= 0 || !p.precio || p.precio <= 0) return null;
    return p.precio / s;
  }

  function calcularEtiquetasPrecio(propiedades) {
    var resultado = {};
    propiedades.forEach(function (p) {
      var propio = precioM2(p);
      var base = { id: p.id, precioM2: propio, promedioComparables: null,
                   numComparables: 0, diferenciaPct: null, etiqueta: null, motivo: "" };
      if (propio === null) {
        base.motivo = "Sin superficie o precio válido";
        resultado[p.id] = base; return;
      }
      var comps = propiedades.filter(function (o) {
        return o.id !== p.id && grupo(o) === grupo(p) && precioM2(o) !== null;
      });
      base.numComparables = comps.length;
      if (comps.length === 0) {
        base.motivo = "Sin propiedades comparables en " + p.zona;
        resultado[p.id] = base; return;
      }
      var prom = comps.reduce(function (s, o) { return s + precioM2(o); }, 0) / comps.length;
      var ratio = propio / prom;
      base.promedioComparables = prom;
      base.diferenciaPct = Math.round((ratio - 1) * 100);
      if (ratio <= UMBRAL_BAJO) base.etiqueta = "Buena oportunidad";
      else if (ratio >= UMBRAL_ALTO) base.etiqueta = "Precio alto";
      else base.etiqueta = "Precio en rango";
      resultado[p.id] = base;
    });
    return resultado;
  }

  var api = { calcularEtiquetasPrecio: calcularEtiquetasPrecio, precioM2: precioM2,
              UMBRAL_BAJO: UMBRAL_BAJO, UMBRAL_ALTO: UMBRAL_ALTO };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PriceTags = api;
})(this);
