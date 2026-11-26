/* =========================================================
   Home Finder — Etiquetas automáticas de precio (Assignment 2)

   Para cada propiedad compara su precio por m² contra el promedio
   de las OTRAS propiedades comparables:
     - misma zona (campo `zona`, sin distinguir mayúsculas ni acentos)
     - mismo tipo de superficie: terrenos por m² de terreno,
       casas y departamentos por m² construidos
   Reglas (sobre el porcentaje YA redondeado que ve el usuario):
     dif <= -15 %  -> "Buena oportunidad"
     dif >= +15 %  -> "Precio alto"
     en medio      -> "Precio en rango"
     sin comparables o sin superficie -> sin etiqueta (null) + motivo

   Complejidad: O(n). Primero suma y cuenta por grupo; luego cada
   propiedad usa (suma del grupo - su valor) / (n del grupo - 1).
   La versión anterior filtraba toda la lista por cada propiedad: O(n²).
   ========================================================= */
(function (root) {
  "use strict";

  var UMBRAL_PCT = 15;
  var MIN_COMPARABLES = 1;

  function normaliza(s) {
    return String(s == null ? "" : s)
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .trim().toLowerCase();
  }

  function esTerreno(p) { return p.tipo === "Terreno"; }

  function superficie(p) { return esTerreno(p) ? p.terreno : p.m2; }

  function claveGrupo(p) {
    return normaliza(p.zona) + "|" + (esTerreno(p) ? "terreno" : "construccion");
  }

  function precioM2(p) {
    var s = Number(superficie(p));
    var precio = Number(p.precio);
    if (!(s > 0) || !(precio > 0)) return null;
    return precio / s;
  }

  function clasificar(pct) {
    if (pct <= -UMBRAL_PCT) return "Buena oportunidad";
    if (pct >= UMBRAL_PCT) return "Precio alto";
    return "Precio en rango";
  }

  function calcularEtiquetasPrecio(propiedades) {
    var grupos = {};
    propiedades.forEach(function (p) {
      var v = precioM2(p);
      if (v === null) return;
      var k = claveGrupo(p);
      var g = grupos[k] || (grupos[k] = { suma: 0, n: 0 });
      g.suma += v;
      g.n += 1;
    });

    var resultado = {};
    propiedades.forEach(function (p) {
      var propio = precioM2(p);
      var r = {
        id: p.id, grupo: claveGrupo(p), precioM2: propio,
        promedioComparables: null, numComparables: 0,
        diferenciaPct: null, etiqueta: null, motivo: ""
      };
      if (propio === null) {
        r.motivo = "Sin superficie o precio válido";
        resultado[p.id] = r;
        return;
      }
      var g = grupos[r.grupo];
      var n = g.n - 1;
      r.numComparables = n;
      if (n < MIN_COMPARABLES) {
        r.motivo = "No hay otro " + (esTerreno(p) ? "terreno" : "inmueble construido") +
          " en " + p.zona + " para comparar";
        resultado[p.id] = r;
        return;
      }
      var promedio = (g.suma - propio) / n;
      var pct = Math.round((propio / promedio - 1) * 100);
      if (pct === 0) pct = 0; // evita mostrar "-0 %"
      r.promedioComparables = promedio;
      r.diferenciaPct = pct;
      r.etiqueta = clasificar(pct);
      resultado[p.id] = r;
    });
    return resultado;
  }

  /* Comparables de una propiedad (para mostrarlos en su ficha). */
  function comparablesDe(propiedad, propiedades) {
    var k = claveGrupo(propiedad);
    return propiedades.filter(function (o) {
      return o.id !== propiedad.id && claveGrupo(o) === k && precioM2(o) !== null;
    });
  }

  var api = {
    calcularEtiquetasPrecio: calcularEtiquetasPrecio,
    comparablesDe: comparablesDe,
    precioM2: precioM2,
    clasificar: clasificar,
    UMBRAL_PCT: UMBRAL_PCT,
    MIN_COMPARABLES: MIN_COMPARABLES
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.PriceTags = api;
})(this);
