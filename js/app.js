/* =========================================================
   Home Finder Exclusive — aplicación (sin frameworks ni build)
   Vistas por hash: #inicio · #buscar · #guardadas · #propiedad-<id>
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = {
    whatsapp: "33612345678",            // DEMO: reemplazar por el número real (código de país + número)
    whatsappVisible: "+33 6 12 34 56 78",
    email: "visitas@homefinder-exclusive.example",
    porPagina: 8,
    fxCacheHoras: 12,
    fxTimeoutMs: 4000
  };

  /* ---------------- utilidades ---------------- */
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  function esc(v) {
    return String(v == null ? "" : v)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function norm(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento: seguimos */ } }
  };
  function img(id, w) {
    return "https://images.unsplash.com/photo-" + encodeURIComponent(id) + "?auto=format&fit=crop&w=" + w + "&q=70";
  }
  function srcset(id) { return [480, 800, 1200].map(function (w) { return img(id, w) + " " + w + "w"; }).join(", "); }
  var nf = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  var SYM = { MXN: "$", EUR: "€", USD: "US$" };

  /* ---------------- estado ---------------- */
  var S = {
    props: [], byId: {}, tags: {}, zonas: [],
    rates: { EUR_MXN: 21.52, EUR_USD: 1.096, fecha: "", fuente: "respaldo" },
    currency: store.get("hf:moneda", "MXN"),
    favs: store.get("hf:guardadas", []),
    f: null, sort: "recomendadas", shown: 0,
    view: "inicio", lastListView: "buscar",
    map: null, markers: {}, mapBounds: null, mapState: "idle",
    igShown: 9, igPhotos: []
  };
  function filtrosVacios() {
    return { q: "", zonas: [], min: 0, max: 0, rec: 0, ban: 0, tipos: [], etiquetas: [], amen: [], soloGuardadas: false };
  }
  S.f = filtrosVacios();

  function money(eur, compact) {
    var v = Finance.convertir(eur, S.currency, S.rates);
    var sym = SYM[S.currency];
    if (compact && v >= 1e6) return sym + nf1.format(v / 1e6) + " M";
    return sym + nf.format(v) + (S.currency === "MXN" && !compact ? " MXN" : "");
  }
  function moneyM2(eur) { return money(eur, false).replace(" MXN", "") + "/m²"; }

  /* ---------------- tipo de cambio (API externa, S16) ---------------- */
  function fetchJSON(url, ms) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .finally(function () { clearTimeout(t); });
  }
  function cargarTipoCambio() {
    var cache = store.get("hf:fx", null);
    if (cache && Date.now() - cache.t < CONFIG.fxCacheHoras * 3600e3) {
      S.rates = cache.rates; pintarFx(); return Promise.resolve();
    }
    // Documentación: https://frankfurter.dev — GET /v2/rate/{base}/{quote} -> {date, base, quote, rate}
    return Promise.all([
      fetchJSON("https://api.frankfurter.dev/v2/rate/eur/mxn", CONFIG.fxTimeoutMs),
      fetchJSON("https://api.frankfurter.dev/v2/rate/eur/usd", CONFIG.fxTimeoutMs)
    ]).then(function (r) {
      var mxn = Number(r[0] && r[0].rate), usd = Number(r[1] && r[1].rate);
      if (!(mxn > 0) || !(usd > 0)) throw new Error("respuesta sin tipo de cambio");
      S.rates = { EUR_MXN: mxn, EUR_USD: usd, fecha: r[0].date || "", fuente: "Frankfurter (BCE)" };
      store.set("hf:fx", { t: Date.now(), rates: S.rates });
    }).catch(function () {
      /* sin red o API caída: se queda el tipo de cambio de respaldo del JSON */
    }).then(pintarFx);
  }
  function pintarFx() {
    var r = S.rates;
    $("#fxNote").textContent = "Tipo de cambio: 1 EUR = $" + r.EUR_MXN.toFixed(2) + " MXN = US$" + r.EUR_USD.toFixed(3) +
      " (" + r.fuente + (r.fecha ? ", " + r.fecha : "") + "). Los precios de origen están en euros.";
  }

  /* ---------------- helpers de propiedad ---------------- */
  function sup(p) { return p.tipo === "Terreno" ? p.terreno : p.m2; }
  function tagClass(e) { return !e || !e.etiqueta ? "tag-none" : e.etiqueta === "Buena oportunidad" ? "tag-op" : e.etiqueta === "Precio alto" ? "tag-hi" : "tag-ok"; }
  function tagText(e) {
    if (!e || !e.etiqueta) return "Sin comparables";
    var d = e.diferenciaPct;
    if (e.etiqueta === "Precio en rango") return "En rango (" + (d > 0 ? "+" : "") + d + " %)";
    return e.etiqueta + " (" + (d > 0 ? "+" : "") + d + " %)";
  }
  function tagHTML(p) { var e = S.tags[p.id]; return '<span class="tag ' + tagClass(e) + '">' + esc(tagText(e)) + "</span>"; }
  function specsHTML(p) {
    if (p.tipo === "Terreno") return "<span><b>" + nf.format(p.terreno) + "</b> m² de terreno</span><span>Terreno</span>";
    return "<span><b>" + p.recamaras + "</b> rec.</span><span><b>" + (p.banos + (p.mediosBanos ? 0.5 * p.mediosBanos : 0)) + "</b> baños</span><span><b>" + nf.format(p.m2) + "</b> m²</span>";
  }
  function lugar(p) { return p.comuna + ", " + p.departamento; }
  function isFav(id) { return S.favs.indexOf(id) > -1; }
  function toggleFav(id) {
    var i = S.favs.indexOf(id);
    if (i > -1) S.favs.splice(i, 1); else S.favs.push(id);
    store.set("hf:guardadas", S.favs);
    pintarContador();
    $$('[data-fav="' + id + '"]').forEach(function (b) { b.setAttribute("aria-pressed", String(isFav(id))); });
    toast(isFav(id) ? "Guardada en tu lista" : "Quitada de tu lista");
    if (S.f.soloGuardadas && S.view !== "inicio") aplicar();
  }
  function pintarContador() { $("#savedCount").textContent = S.favs.length; }

  var toastT;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* imágenes rotas (foto no disponible / sin red / CSP): reemplazo neutro */
  var PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22344A"/><stop offset="1" stop-color="#0B1B2E"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><path d="M150 170 200 128l50 42v52h-34v-32h-32v32h-34z" fill="none" stroke="#E0218A" stroke-width="6" stroke-linejoin="round"/><text x="200" y="262" fill="#B8C4D3" font-family="sans-serif" font-size="16" text-anchor="middle">Foto no disponible</text></svg>');
  document.addEventListener("error", function (ev) {
    var t = ev.target;
    if (t && t.tagName === "IMG" && t.src !== PLACEHOLDER && !t.classList.contains("leaflet-tile")) { t.removeAttribute("srcset"); t.src = PLACEHOLDER; }
  }, true);

  /* =========================================================
     LANDING
     ========================================================= */
  function pintarLanding() {
    var heroP = S.byId[8] || S.props[0];
    $("#heroMedia").innerHTML = '<img src="' + img(heroP.fotos[0].id, 1600) + '" srcset="' + img(heroP.fotos[0].id, 1000) + " 1000w, " + img(heroP.fotos[0].id, 1600) + " 1600w, " + img(heroP.fotos[0].id, 2400) + ' 2400w" sizes="100vw" alt="' + esc(heroP.fotos[0].alt) + '" fetchpriority="high">';

    // prueba social real: la mayor oportunidad calculada
    var best = S.props.filter(function (p) { return S.tags[p.id].etiqueta === "Buena oportunidad"; })
      .sort(function (a, b) { return S.tags[a.id].diferenciaPct - S.tags[b.id].diferenciaPct; })[0];
    if (best) {
      var hp = $("#heroProof");
      hp.href = "#propiedad-" + best.id;
      hp.innerHTML = '<img src="' + img(best.fotos[0].id, 200) + '" alt=""><div><strong>' + esc(best.titulo) + "</strong><small>" + money(best.precio, true) + " · " + esc(best.comuna) + "</small><br>" + tagHTML(best) + "</div>";
    }

    // mercados
    $("#markets").innerHTML = S.zonas.map(function (z) {
      var ps = S.props.filter(function (p) { return p.zona === z && p.tipo !== "Terreno"; });
      var all = S.props.filter(function (p) { return p.zona === z; });
      var prom = ps.reduce(function (s, p) { return s + PriceTags.precioM2(p); }, 0) / Math.max(1, ps.length);
      var foto = (all[0] || {}).fotos[0];
      return '<button class="market" type="button" data-zona="' + esc(z) + '"><img src="' + img(foto.id, 700) + '" alt="" loading="lazy"><div class="market-body"><h3>' + esc(z) + "</h3><p>" + all.length + " propiedades<br><span class=\"ppm\">" + moneyM2(prom) + "</span> en promedio</p></div></button>";
    }).join("");

    // destacadas (exclusivas)
    var feats = S.props.filter(function (p) { return p.estado === "Exclusiva"; }).sort(function (a, b) { return b.precio - a.precio; }).slice(0, 3);
    $("#featured").innerHTML = feats.map(function (p, i) {
      var f = p.fotos[0];
      return '<a class="feat" href="#propiedad-' + p.id + '"><img src="' + img(f.id, i === 0 ? 1400 : 900) + '" alt="' + esc(f.alt) + '" loading="lazy"><div class="feat-body">' + tagHTML(p) + '<span class="price">' + money(p.precio, true) + "</span><h3>" + esc(p.titulo) + "</h3><small>" + esc(lugar(p)) + "</small></div></a>";
    }).join("");

    pintarContexto();
    pintarGaleria();
    var cnt = S.props.length;
    $$('a.link-strong[href="#buscar"]').forEach(function (a) { a.textContent = "Ver las " + cnt + " propiedades"; });
  }

  function pintarContexto() {
    var p = S.byId[2] || S.props[0];
    var comps = PriceTags.comparablesDe(p, S.props);
    var e = S.tags[p.id];
    var rows = [p].concat(comps);
    var maxV = Math.max.apply(null, rows.map(PriceTags.precioM2)) * 1.08;
    var avgPos = (e.promedioComparables / maxV) * 100;
    $("#contextViz").innerHTML =
      '<p class="viz-title">Precio por m² en ' + esc(p.zona) + "</p>" +
      '<p class="viz-prop">' + esc(p.titulo) + "</p>" +
      '<div class="bars">' + rows.map(function (r) {
        var v = PriceTags.precioM2(r);
        return '<div class="bar' + (r.id === p.id ? " is-self" : "") + '"><span class="bar-name">' + esc(r.id === p.id ? "Esta villa" : r.comuna) + '</span><span class="bar-track"><span class="bar-fill" style="width:' + (v / maxV * 100).toFixed(1) + '%"></span>' + (r.id === p.id ? "" : "") + '<span class="bar-avg" style="left:' + avgPos.toFixed(1) + '%" title="Promedio de comparables"></span></span><span class="bar-val">' + moneyM2(v) + "</span></div>";
      }).join("") + "</div>" +
      '<figcaption class="viz-foot">' + tagHTML(p) + "<span>La línea blanca marca el promedio de las " + e.numComparables + " comparables: " + moneyM2(e.promedioComparables) + ".</span></figcaption>";
  }

  function pintarGaleria() {
    if (!S.igPhotos.length) {
      // intercala fotos de distintas propiedades
      var maxF = Math.max.apply(null, S.props.map(function (p) { return p.fotos.length; }));
      for (var i = 0; i < maxF; i++) S.props.forEach(function (p) { if (p.fotos[i]) S.igPhotos.push({ p: p, f: p.fotos[i] }); });
      $("#galeriaCount").textContent = S.igPhotos.length;
      $("#galeriaProps").textContent = S.props.length;
    }
    $("#igGrid").innerHTML = S.igPhotos.slice(0, S.igShown).map(function (x) {
      return '<a class="ig" href="#propiedad-' + x.p.id + '"><img src="' + img(x.f.id, 600) + '" alt="' + esc(x.f.alt) + '" loading="lazy"><span>' + esc(x.p.comuna) + " · " + money(x.p.precio, true) + "</span></a>";
    }).join("");
    $("#igMore").hidden = S.igShown >= S.igPhotos.length;
  }

  /* =========================================================
     BÚSQUEDA: filtros, orden, tarjetas
     ========================================================= */
  var AMEN = [
    { k: "alberca", t: "Alberca", fn: function (p) { return p.amenidades.some(function (a) { return /alberca/i.test(a); }); } },
    { k: "frente", t: "A menos de 200 m del mar", fn: function (p) { return p.distanciaMar <= 200; } },
    { k: "jardin", t: "Jardín", fn: function (p) { return p.amenidades.some(function (a) { return /jard[ií]n|olivar|viñedo/i.test(a); }) || p.terreno >= 1500; } },
    { k: "spa", t: "Spa o gimnasio", fn: function (p) { return p.amenidades.some(function (a) { return /spa|gimnasio|hammam/i.test(a); }); } },
    { k: "huespedes", t: "Casa de huéspedes", fn: function (p) { return p.amenidades.some(function (a) { return /hu[eé]spedes|pool house/i.test(a); }); } },
    { k: "nueva", t: "Construcción reciente (2015+)", fn: function (p) { return p.anio >= 2015; } },
    { k: "reducido", t: "Precio reducido", fn: function (p) { return p.estado === "Precio reducido"; } },
    { k: "exclusiva", t: "Exclusiva", fn: function (p) { return p.estado === "Exclusiva"; } }
  ];
  var PRECIOS = [0, 2e6, 3e6, 5e6, 7.5e6, 10e6, 15e6, 20e6];
  var ETIQ = ["Buena oportunidad", "Precio en rango", "Precio alto"];
  var TIPOS = [["Casa", "Villa o casa"], ["Departamento", "Departamento"], ["Terreno", "Terreno"]];

  function pasa(p, f, ignorarMapa) {
    var e = S.tags[p.id];
    if (f.q) {
      var hay = norm([p.titulo, p.comuna, p.zona, p.departamento, p.vista].join(" "));
      if (norm(f.q).split(/\s+/).some(function (w) { return hay.indexOf(w) === -1; })) return false;
    }
    if (f.zonas.length && f.zonas.indexOf(p.zona) === -1) return false;
    if (f.min && p.precio < f.min) return false;
    if (f.max && p.precio > f.max) return false;
    if (f.rec && p.recamaras < f.rec) return false;
    if (f.ban && p.banos < f.ban) return false;
    if (f.tipos.length && f.tipos.indexOf(p.tipo) === -1) return false;
    if (f.etiquetas.length && (!e.etiqueta || f.etiquetas.indexOf(e.etiqueta) === -1)) return false;
    for (var i = 0; i < f.amen.length; i++) {
      var a = AMEN.filter(function (x) { return x.k === f.amen[i]; })[0];
      if (a && !a.fn(p)) return false;
    }
    if (f.soloGuardadas && !isFav(p.id)) return false;
    if (!ignorarMapa && S.mapBounds && $("#mapSync").checked && !S.mapBounds.contains([p.lat, p.lng])) return false;
    return true;
  }
  var ORDEN = {
    "recomendadas": function (a, b) { var x = S.tags[a.id].diferenciaPct, y = S.tags[b.id].diferenciaPct; return (x == null ? 999 : x) - (y == null ? 999 : y); },
    "recientes": function (a, b) { return b.publicado.localeCompare(a.publicado); },
    "precio-asc": function (a, b) { return a.precio - b.precio; },
    "precio-desc": function (a, b) { return b.precio - a.precio; },
    "m2-asc": function (a, b) { return PriceTags.precioM2(a) - PriceTags.precioM2(b); },
    "superficie-desc": function (a, b) { return sup(b) - sup(a); }
  };

  function resultados() { return S.props.filter(function (p) { return pasa(p, S.f); }).sort(ORDEN[S.sort]); }

  function construirFiltros() {
    $("#zonaOpts").innerHTML = S.zonas.map(function (z) {
      var n = S.props.filter(function (p) { return p.zona === z; }).length;
      return '<label><input type="checkbox" value="' + esc(z) + '" data-f="zonas"> ' + esc(z) + '<span class="n">' + n + "</span></label>";
    }).join("");
    $("#tipoOpts").innerHTML = TIPOS.map(function (t) { return '<label><input type="checkbox" value="' + t[0] + '" data-f="tipos"> ' + t[1] + "</label>"; }).join("");
    $("#etiquetaOpts").innerHTML = ETIQ.map(function (t) {
      var cls = t === "Buena oportunidad" ? "tag-op" : t === "Precio alto" ? "tag-hi" : "tag-ok";
      return '<label><input type="checkbox" value="' + t + '" data-f="etiquetas"> <span class="tag ' + cls + '">' + t + "</span></label>";
    }).join("");
    $("#amenOpts").innerHTML = AMEN.map(function (a) { return '<label><input type="checkbox" value="' + a.k + '" data-f="amen"> ' + a.t + "</label>"; }).join("");
    $("#segRec").innerHTML = [0, 1, 2, 3, 4, 5, 6].map(function (n) { return '<button type="button" data-seg="rec" data-v="' + n + '" aria-pressed="' + (n === 0) + '">' + (n ? n + "+" : "Todas") + "</button>"; }).join("");
    $("#segBan").innerHTML = [0, 2, 3, 4, 5, 6].map(function (n) { return '<button type="button" data-seg="ban" data-v="' + n + '" aria-pressed="' + (n === 0) + '">' + (n ? n + "+" : "Todos") + "</button>"; }).join("");
    opcionesPrecio();
    var hz = $("#heroZona"), ci = $("#cInterest");
    hz.innerHTML = '<option value="">Toda la Costa Azul</option>' + S.zonas.map(function (z) { return '<option value="' + esc(z) + '">' + esc(z) + "</option>"; }).join("");
    ci.innerHTML = '<option value="">Todavía no lo sé</option>' + S.props.map(function (p) { return '<option value="' + p.id + '">' + esc(p.titulo) + "</option>"; }).join("");
  }
  function opcionesPrecio() {
    var mk = function (sel, label0) {
      return PRECIOS.map(function (v) { return '<option value="' + v + '"' + (v === sel ? " selected" : "") + ">" + (v ? money(v, true) : label0) + "</option>"; }).join("");
    };
    $("#fMin").innerHTML = mk(S.f.min, "Sin mínimo");
    $("#fMax").innerHTML = mk(S.f.max, "Sin máximo");
  }

  function sincronizarControles() {
    $("#q").value = S.f.q;
    $$("[data-f]").forEach(function (c) { c.checked = S.f[c.dataset.f].indexOf(c.value) > -1; });
    $$("[data-seg]").forEach(function (b) { b.setAttribute("aria-pressed", String(Number(b.dataset.v) === S.f[b.dataset.seg])); });
    $("#fMin").value = String(S.f.min); $("#fMax").value = String(S.f.max);
    $("#onlySaved").setAttribute("aria-pressed", String(S.f.soloGuardadas));
    $("#sort").value = S.sort;
  }

  function resumenPills() {
    var f = S.f;
    var set = function (id, txt) { var b = $("#" + id); b.textContent = txt || ""; b.parentElement.classList.toggle("is-active", !!txt); };
    set("pillZona", f.zonas.length ? (f.zonas.length === 1 ? f.zonas[0] : f.zonas.length) : "");
    set("pillPrecio", f.min || f.max ? (f.min ? money(f.min, true) : "") + "–" + (f.max ? money(f.max, true) : "") : "");
    set("pillRec", f.rec || f.ban ? [f.rec ? f.rec + "+ rec" : "", f.ban ? f.ban + "+ baños" : ""].filter(Boolean).join(", ") : "");
    set("pillTipo", f.tipos.length ? f.tipos.length : "");
    set("pillEtiqueta", f.etiquetas.length ? f.etiquetas.length : "");
    set("pillMas", f.amen.length ? f.amen.length : "");
    var activos = chipsActivos();
    $("#btnReset").hidden = activos.length === 0;
    $("#activeChips").innerHTML = activos.map(function (c, i) {
      return '<button class="chip" type="button" data-chip="' + i + '" aria-label="Quitar filtro: ' + esc(c.t) + '">' + esc(c.t) + ' <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
    }).join("");
    S._chips = activos;
  }
  function chipsActivos() {
    var f = S.f, out = [];
    if (f.q) out.push({ t: "“" + f.q + "”", quitar: function () { f.q = ""; } });
    f.zonas.forEach(function (z) { out.push({ t: z, quitar: function () { f.zonas = f.zonas.filter(function (x) { return x !== z; }); } }); });
    if (f.min) out.push({ t: "Desde " + money(f.min, true), quitar: function () { f.min = 0; } });
    if (f.max) out.push({ t: "Hasta " + money(f.max, true), quitar: function () { f.max = 0; } });
    if (f.rec) out.push({ t: f.rec + "+ recámaras", quitar: function () { f.rec = 0; } });
    if (f.ban) out.push({ t: f.ban + "+ baños", quitar: function () { f.ban = 0; } });
    f.tipos.forEach(function (t) { out.push({ t: TIPOS.filter(function (x) { return x[0] === t; })[0][1], quitar: function () { f.tipos = f.tipos.filter(function (x) { return x !== t; }); } }); });
    f.etiquetas.forEach(function (t) { out.push({ t: t, quitar: function () { f.etiquetas = f.etiquetas.filter(function (x) { return x !== t; }); } }); });
    f.amen.forEach(function (k) { out.push({ t: AMEN.filter(function (a) { return a.k === k; })[0].t, quitar: function () { f.amen = f.amen.filter(function (x) { return x !== k; }); } }); });
    if (f.soloGuardadas) out.push({ t: "Solo guardadas", quitar: function () { f.soloGuardadas = false; } });
    return out;
  }

  function aplicar(resetPaginas) {
    if (resetPaginas !== false) S.shown = CONFIG.porPagina;
    store.set("hf:filtros", { f: S.f, sort: S.sort });
    resumenPills();
    sincronizarControles();
    pintarTarjetas();
    pintarMarcadores();
  }

  function cardHTML(p) {
    var fotos = p.fotos.slice(0, 5);
    var e = S.tags[p.id];
    var badges = (p.estado !== "En venta" ? '<span class="badge' + (p.estado === "Exclusiva" ? " brand" : "") + '">' + esc(p.estado) + "</span>" : "");
    return '<article class="card" data-id="' + p.id + '">' +
      '<div class="card-media" data-i="0">' +
        '<div class="card-track">' + fotos.map(function (f, i) {
          return '<img src="' + img(f.id, 800) + '" srcset="' + srcset(f.id) + '" sizes="(max-width: 680px) 100vw, (max-width: 980px) 50vw, 25vw" alt="' + esc(f.alt) + '"' + (i ? ' loading="lazy"' : "") + ' decoding="async" width="800" height="533">';
        }).join("") + "</div>" +
        (fotos.length > 1 ? '<button class="card-nav prev" type="button" data-step="-1" aria-label="Foto anterior de ' + esc(p.titulo) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button><button class="card-nav next" type="button" data-step="1" aria-label="Foto siguiente de ' + esc(p.titulo) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button><div class="card-dots" aria-hidden="true">' + fotos.map(function (f, i) { return "<i" + (i ? "" : ' class="on"') + "></i>"; }).join("") + "</div>" : "") +
        '<div class="card-badges">' + badges + "</div>" +
        '<button class="fav" type="button" data-fav="' + p.id + '" aria-pressed="' + isFav(p.id) + '" aria-label="Guardar ' + esc(p.titulo) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.5 0 5.4 3.5 4.1 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z"/></svg></button>' +
      "</div>" +
      '<div class="card-body">' +
        '<div class="card-price"><strong>' + money(p.precio, true) + "</strong><span>" + (e.precioM2 ? moneyM2(e.precioM2) : "") + "</span></div>" +
        '<div class="card-specs">' + specsHTML(p) + "</div>" +
        '<p class="card-title"><a href="#propiedad-' + p.id + '">' + esc(p.titulo) + "</a></p>" +
        '<div class="card-ctx">' + tagHTML(p) + "<span>vs. " + esc(p.zona) + "</span></div>" +
      "</div></article>";
  }

  function pintarTarjetas() {
    var lista = resultados();
    var total = lista.length;
    var ver = lista.slice(0, S.shown);
    $("#resultCount").textContent = total === 1 ? "1 propiedad" : total + " propiedades";
    if (!total) {
      $("#cards").innerHTML = '<div class="empty"><h2>Sin propiedades con estos filtros</h2><p>' +
        (S.f.soloGuardadas && !S.favs.length ? "Todavía no guardas ninguna. Toca el corazón de una propiedad para tenerla aquí." : "Quita algún filtro o amplía el rango de precio para ver más opciones.") +
        '</p><button class="btn btn-ink" type="button" data-reset>Quitar todos los filtros</button></div>';
    } else {
      $("#cards").innerHTML = ver.map(cardHTML).join("");
    }
    var lm = $("#loadMore");
    lm.hidden = total <= S.shown;
    lm.textContent = "Ver " + Math.min(CONFIG.porPagina, total - S.shown) + " más de " + (total - S.shown);
  }

  function moverCarrusel(media, step) {
    var n = $$("img", media).length;
    var i = (Number(media.dataset.i) + step + n) % n;
    media.dataset.i = i;
    $(".card-track", media).style.transform = "translateX(" + (-100 * i) + "%)";
    $$(".card-dots i", media).forEach(function (d, j) { d.classList.toggle("on", j === i); });
  }

  /* ---------------- popovers de filtros ---------------- */
  var popAbierto = null;
  function abrirPop(btn) {
    var pop = $("#" + btn.dataset.pop);
    if (popAbierto && popAbierto.pop === pop) { cerrarPop(); return; }
    cerrarPop();
    pop.hidden = false;
    var r = btn.getBoundingClientRect();
    var w = pop.offsetWidth;
    pop.style.top = (r.bottom + 8) + "px";
    pop.style.left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12)) + "px";
    btn.setAttribute("aria-expanded", "true");
    popAbierto = { btn: btn, pop: pop };
    var first = $("input, select, button", pop); if (first) first.focus();
  }
  function cerrarPop(devolverFoco) {
    if (!popAbierto) return;
    popAbierto.pop.hidden = true;
    popAbierto.btn.setAttribute("aria-expanded", "false");
    if (devolverFoco) popAbierto.btn.focus();
    popAbierto = null;
  }

  /* =========================================================
     MAPA (Leaflet local + teselas OpenStreetMap)
     ========================================================= */
  var leafletPromise = null;
  function cargarLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise(function (ok, fail) {
      var css = document.createElement("link"); css.rel = "stylesheet"; css.href = "vendor/leaflet/leaflet.css";
      document.head.appendChild(css);
      var s = document.createElement("script"); s.src = "vendor/leaflet/leaflet.js";
      s.onload = function () { window.L ? ok(window.L) : fail(new Error("Leaflet no cargó")); };
      s.onerror = function () { fail(new Error("Leaflet no cargó")); };
      document.head.appendChild(s);
    });
    return leafletPromise;
  }
  function tileLayer(L, map, onFail) {
    var errores = 0, cargadas = 0;
    var capa = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    capa.on("tileload", function () { cargadas++; });
    capa.on("tileerror", function () { errores++; if (errores >= 4 && cargadas === 0 && onFail) { onFail(); onFail = null; } });
    capa.addTo(map);
    return capa;
  }
  function pinIcon(L, p) {
    var e = S.tags[p.id];
    var cls = e.etiqueta === "Buena oportunidad" ? "op" : e.etiqueta === "Precio alto" ? "hi" : "";
    return L.divIcon({ className: "pin " + cls, html: "<span>" + money(p.precio, true) + "</span>", iconSize: null });
  }
  function popupHTML(p) {
    return '<div class="pop-card"><img src="' + img(p.fotos[0].id, 480) + '" alt=""><div><strong>' + money(p.precio, true) + "</strong><small>" + esc(p.titulo) + "</small>" + tagHTML(p) + '<button type="button" data-open="' + p.id + '">Ver ficha</button></div></div>';
  }
  function iniciarMapa() {
    if (S.mapState !== "idle") return;
    S.mapState = "loading";
    cargarLeaflet().then(function (L) {
      var map = L.map("map", { zoomControl: true, scrollWheelZoom: true, attributionControl: true });
      tileLayer(L, map, function () { mapaRespaldo("No se pudieron cargar las teselas del mapa."); });
      S.map = map;
      S.mapState = "ready";
      map.on("moveend", function () {
        S.mapBounds = map.getBounds();
        if ($("#mapSync").checked) { pintarTarjetas(); }
      });
      pintarMarcadores(true);
    }).catch(function () { mapaRespaldo("El mapa no está disponible en este momento."); });
  }
  function pintarMarcadores(encuadrar) {
    if (S.mapState === "fallback") { mapaRespaldo(); return; }
    if (S.mapState !== "ready") return;
    var L = window.L, map = S.map;
    Object.keys(S.markers).forEach(function (id) { map.removeLayer(S.markers[id]); });
    S.markers = {};
    var lista = S.props.filter(function (p) { return pasa(p, S.f, true); });
    lista.forEach(function (p) {
      var m = L.marker([p.lat, p.lng], { icon: pinIcon(L, p), keyboard: true, title: p.titulo, riseOnHover: true });
      m.bindPopup(popupHTML(p), { closeButton: true, autoPanPadding: [40, 40] });
      m.on("mouseover", function () { resaltarTarjeta(p.id, true); });
      m.on("mouseout", function () { resaltarTarjeta(p.id, false); });
      m.addTo(map);
      S.markers[p.id] = m;
    });
    if (encuadrar || !$("#mapSync").checked) {
      var pts = lista.length ? lista : S.props;
      map.fitBounds(L.latLngBounds(pts.map(function (p) { return [p.lat, p.lng]; })), { padding: [48, 48], maxZoom: 14 });
    }
  }
  function resaltarTarjeta(id, on) { var c = $('.card[data-id="' + id + '"]'); if (c) c.classList.toggle("is-hot", on); }
  function resaltarPin(id, on) { var m = S.markers[id]; if (m && m._icon) { m._icon.classList.toggle("is-hot", on); m.setZIndexOffset(on ? 1000 : 0); } }

  function mapaRespaldo(msg) {
    // Mapa esquemático: proyecta lat/lng de las propiedades sin depender de servicios externos.
    S.mapState = "fallback";
    var lista = S.props.filter(function (p) { return pasa(p, S.f, true); });
    var minLat = 43.15, maxLat = 43.82, minLng = 6.5, maxLng = 7.55;
    var X = function (lng) { return ((lng - minLng) / (maxLng - minLng)) * 1000; };
    var Y = function (lat) { return (1 - (lat - minLat) / (maxLat - minLat)) * 700; };
    $("#map").innerHTML = '<div class="map-fallback"><svg viewBox="0 0 1000 700" role="img" aria-label="Mapa esquemático de la Costa Azul">' +
      '<rect width="1000" height="700" fill="#CFE0EC"/><path d="M0 0H1000V330C930 300 880 250 820 270 760 290 720 230 640 250 580 265 520 300 470 330 420 360 380 420 330 430 280 440 230 470 170 520 110 560 60 600 0 620Z" fill="#EEF2EC"/>' +
      lista.map(function (p) {
        var e = S.tags[p.id];
        var c = e.etiqueta === "Buena oportunidad" ? "#0A7F73" : e.etiqueta === "Precio alto" ? "#C2410C" : "#0B1B2E";
        return '<a href="#propiedad-' + p.id + '"><g transform="translate(' + X(p.lng).toFixed(0) + "," + Y(p.lat).toFixed(0) + ')"><circle r="11" fill="' + c + '" stroke="#fff" stroke-width="3"/><title>' + esc(p.titulo + " — " + money(p.precio, true)) + "</title></g></a>";
      }).join("") +
      '<text x="24" y="680" fill="#546273" font-size="18" font-family="sans-serif">' + esc(msg || "Mapa esquemático (sin conexión al servicio de mapas)") + "</text></svg></div>";
  }

  /* =========================================================
     FICHA DE PROPIEDAD
     ========================================================= */
  var lastFocus = null;
  function abrirFicha(id) {
    var p = S.byId[id];
    if (!p) { location.hash = "#buscar"; return; }
    if (!$("#sheet").hidden && S.fichaId === id) return;
    S.fichaId = id;
    if ($("#sheet").hidden) lastFocus = document.activeElement;
    var e = S.tags[p.id];
    var comps = PriceTags.comparablesDe(p, S.props);
    var n = p.fotos.length;
    var mosaic = p.fotos.slice(0, 5).map(function (f, i) {
      return '<button type="button" data-photo="' + i + '" aria-label="Ver foto ' + (i + 1) + " de " + n + '"><img src="' + img(f.id, i ? 700 : 1400) + '" alt="' + esc(f.alt) + '"' + (i ? ' loading="lazy"' : "") + "></button>";
    }).join("");
    var facts = [
      ["Tipo", p.tipo === "Casa" ? "Villa / casa" : p.tipo],
      ["Estado", p.estado],
      ["Precio por m²", e.precioM2 ? moneyM2(e.precioM2) : "—"],
      [p.tipo === "Terreno" ? "Superficie del terreno" : "Construcción", nf.format(sup(p)) + " m²"],
      ["Terreno", p.terreno ? nf.format(p.terreno) + " m²" : "—"],
      ["Recámaras", p.recamaras || "—"],
      ["Baños", p.banos ? p.banos + (p.mediosBanos ? " + " + p.mediosBanos + " medio" + (p.mediosBanos > 1 ? "s" : "") : "") : "—"],
      ["Estacionamientos", p.estacionamientos || "—"],
      ["Niveles", p.niveles || "—"],
      ["Año de construcción", p.anio || "—"],
      ["Vista", p.vista],
      ["Distancia al mar", p.distanciaMar === 0 ? "Frente al mar" : nf.format(p.distanciaMar) + " m"],
      ["Aeropuerto de Niza", p.distanciaAeropuerto + " km"],
      ["Gastos de comunidad", p.gastos ? money(p.gastos) + " al mes" : "No aplica"],
      ["Seguridad", p.seguridad]
    ];
    var pctPos = e.diferenciaPct == null ? 50 : Math.max(2, Math.min(98, 50 + e.diferenciaPct * (50 / 45)));
    var analysis = e.etiqueta ?
      '<div class="analysis"><div class="analysis-head"><p>' + tagHTML(p) + '</p><p><strong>' + moneyM2(e.precioM2) + "</strong> vs. " + moneyM2(e.promedioComparables) + " promedio</p></div>" +
      '<div class="scale" role="img" aria-label="Esta propiedad está ' + Math.abs(e.diferenciaPct) + " % " + (e.diferenciaPct < 0 ? "por debajo" : "por encima") + ' del promedio de su zona"><span class="scale-mark" style="left:' + pctPos.toFixed(1) + '%"><span>' + (e.diferenciaPct > 0 ? "+" : "") + e.diferenciaPct + " %</span></span></div>" +
      '<div class="scale-labels"><span>−45 % o menos</span><span>Promedio</span><span>+45 % o más</span></div>' +
      "<p>Comparada con " + e.numComparables + " " + (p.tipo === "Terreno" ? "terreno" + (e.numComparables > 1 ? "s" : "") : "propiedad" + (e.numComparables > 1 ? "es" : "") + " construida" + (e.numComparables > 1 ? "s" : "")) + " en " + esc(p.zona) + ". Con pocas comparables, cada una pesa mucho en el promedio.</p>" +
      '<div class="comps">' + comps.map(function (c) {
        return '<button class="comp" type="button" data-open="' + c.id + '"><img src="' + img(c.fotos[0].id, 160) + '" alt=""><span>' + esc(c.titulo) + "</span><b>" + moneyM2(PriceTags.precioM2(c)) + "</b></button>";
      }).join("") + "</div></div>"
      : '<div class="analysis"><p>' + tagHTML(p) + " " + esc(e.motivo) + ".</p></div>";
    var similares = S.props.filter(function (o) { return o.id !== p.id && (o.zona === p.zona || Math.abs(o.precio - p.precio) / p.precio < 0.25); })
      .sort(function (a, b) { return (b.zona === p.zona) - (a.zona === p.zona) || Math.abs(a.precio - p.precio) - Math.abs(b.precio - p.precio); }).slice(0, 3);

    $("#sheetPanel").innerHTML =
      '<div class="sheet-top">' +
        '<span class="brand"><svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9"/><path d="M8 15.5 16 9l8 6.5V24h-5.5v-5h-5v5H8z"/></svg><span>Home Finder <em>Exclusive</em></span></span>' +
        '<button class="icon-btn" type="button" data-fav="' + p.id + '" aria-pressed="' + isFav(p.id) + '" aria-label="Guardar esta propiedad"><svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" stroke-width="2"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.5 0 5.4 3.5 4.1 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z"/></svg></button>' +
        '<button class="icon-btn" type="button" id="shareBtn" aria-label="Copiar enlace de esta propiedad"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg></button>' +
        '<button class="icon-btn" type="button" id="sheetClose" aria-label="Cerrar ficha"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
      "</div>" +
      '<div class="mosaic n' + Math.min(n, 5) + '">' + mosaic + '<button class="btn btn-ghost all-photos" type="button" data-photo="0">Ver las ' + n + " fotos</button></div>" +
      '<div class="sheet-body"><div class="sheet-main">' +
        "<div>" +
          '<div class="s-price"><strong>' + money(p.precio) + "</strong><span>" + (S.currency !== "EUR" ? "€" + nf.format(p.precio) + " · " : "") + (e.precioM2 ? moneyM2(e.precioM2) : "") + "</span></div>" +
          '<div class="s-specs">' + specsHTML(p) + "</div>" +
          '<h2 id="sheetTitle">' + esc(p.titulo) + "</h2>" +
          '<p class="s-loc">' + esc(lugar(p)) + " · Ubicación aproximada</p>" +
          '<div class="s-highlights">' + p.destacados.map(function (d) { return "<span>" + esc(d) + "</span>"; }).join("") + "</div>" +
        "</div>" +
        '<section class="s-section"><h3>¿El precio es razonable?</h3>' + analysis + "</section>" +
        '<section class="s-section"><h3>Descripción</h3><p>' + esc(p.descripcion) + "</p></section>" +
        '<section class="s-section"><h3>Datos de la propiedad</h3><dl class="facts">' + facts.map(function (f) { return "<div><dt>" + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd></div>"; }).join("") + "</dl></section>" +
        '<section class="s-section"><h3>Amenidades</h3><ul class="amen">' + p.amenidades.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ul></section>" +
        (p.tipo !== "Terreno" ? calcHTML(p) : "") +
        '<section class="s-section"><h3>Ubicación</h3><div class="mini-map" id="miniMap"></div><p class="credit" style="margin-top:8px">Ubicación aproximada para proteger la privacidad del vendedor. <a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.lat + "," + p.lng) + '" target="_blank" rel="noopener">Abrir en Google Maps</a></p></section>' +
        (similares.length ? '<section class="s-section"><h3>Propiedades similares</h3><div class="similar">' + similares.map(function (o) {
          return '<button class="sim" type="button" data-open="' + o.id + '"><img src="' + img(o.fotos[0].id, 600) + '" alt="" loading="lazy"><div><strong>' + money(o.precio, true) + "</strong><small>" + esc(o.titulo) + "</small>" + tagHTML(o) + "</div></button>";
        }).join("") + "</div></section>" : "") +
        '<p class="credit">Fotos ilustrativas de Unsplash: ' + esc(uniq(p.fotos.map(function (f) { return f.autor; })).join(", ")) + ". No corresponden al inmueble.</p>" +
      "</div>" +
      '<aside class="aside-card"><h3>Agenda una visita</h3><p>Te contesta un asesor por WhatsApp, normalmente el mismo día.</p>' +
        '<a class="btn btn-brand" target="_blank" rel="noopener" href="' + waLink("Hola, me interesa \"" + p.titulo + "\" (" + money(p.precio) + "). ¿Podemos agendar una visita? Ref. HF-" + p.id) + '">Pedir visita por WhatsApp</a>' +
        '<a class="btn btn-ghost" href="#inicio" data-scroll="contacto" data-interest="' + p.id + '">Escribir un mensaje</a>' +
        '<p class="credit">Referencia HF-' + p.id + " · Publicada el " + esc(fecha(p.publicado)) + "</p></aside>" +
      "</div>";

    $("#sheet").hidden = false;
    document.body.classList.add("no-scroll");
    $("#sheet").scrollTop = 0;
    $("#sheetClose").focus();
    S.galeria = p;
    if (p.tipo !== "Terreno") actualizarCalc(p);
    miniMapa(p);
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function fecha(iso) { var d = new Date(iso + "T12:00:00"); return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }); }
  function waLink(msg) { return "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(msg); }

  function cerrarFicha() {
    if ($("#sheet").hidden) return;
    $("#sheet").hidden = true;
    document.body.classList.remove("no-scroll");
    if (S.miniMap) { S.miniMap.remove(); S.miniMap = null; }
    S.fichaId = null;
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  function calcHTML(p) {
    return '<section class="s-section"><h3>Costo mensual estimado</h3><div class="calc" id="calc">' +
      '<div class="calc-total"><strong id="calcTotal"></strong><span>al mes, con hipoteca y gastos de comunidad</span></div>' +
      '<div class="stack" aria-hidden="true"><i class="s1" id="stack1"></i><i class="s2" id="stack2"></i></div>' +
      '<div class="legend"><span class="l1" id="leg1"></span><span class="l2" id="leg2"></span></div>' +
      '<div class="calc-grid">' +
        '<label>Enganche <output id="oEng"></output><input type="range" id="cEng" min="20" max="70" step="5" value="30"></label>' +
        '<label>Plazo <output id="oPlazo"></output><input type="range" id="cPlazo" min="10" max="25" step="5" value="20"></label>' +
        '<label>Tasa anual <output id="oTasa"></output><input type="range" id="cTasa" min="2" max="12" step="0.25" value="3.5"></label>' +
      "</div>" +
      '<p class="credit">Estimación de referencia con pago fijo mensual. No incluye impuestos, seguros ni comisiones; la tasa depende del banco y del país del crédito.</p>' +
      "</div></section>";
  }
  function actualizarCalc(p) {
    var eng = Number($("#cEng").value), plazo = Number($("#cPlazo").value), tasa = Number($("#cTasa").value);
    var c = Finance.costoMensual({ precio: p.precio, enganchePct: eng, tasaAnualPct: tasa, anios: plazo, gastos: p.gastos });
    $("#oEng").textContent = eng + " % (" + money(c.enganche, true) + ")";
    $("#oPlazo").textContent = plazo + " años";
    $("#oTasa").textContent = tasa.toFixed(2) + " %";
    $("#calcTotal").textContent = money(c.total);
    var pct = c.total ? c.hipoteca / c.total * 100 : 100;
    $("#stack1").style.width = pct + "%"; $("#stack2").style.width = (100 - pct) + "%";
    $("#leg1").textContent = "Hipoteca " + money(c.hipoteca);
    $("#leg2").textContent = "Gastos de comunidad " + (c.gastos ? money(c.gastos) : "no aplica");
  }

  function miniMapa(p) {
    var el = $("#miniMap");
    cargarLeaflet().then(function (L) {
      if (!document.body.contains(el)) return;
      var m = L.map(el, { scrollWheelZoom: false, zoomControl: true }).setView([p.lat, p.lng], 14);
      tileLayer(L, m, function () { el.innerHTML = '<div class="map-fallback">No se pudo cargar el mapa. Usa “Abrir en Google Maps”.</div>'; });
      L.circle([p.lat, p.lng], { radius: 350, color: "#E0218A", weight: 2, fillColor: "#E0218A", fillOpacity: .15 }).addTo(m);
      L.marker([p.lat, p.lng], { icon: pinIcon(L, p), keyboard: false }).addTo(m);
      S.miniMap = m;
    }).catch(function () { el.innerHTML = '<div class="map-fallback">No se pudo cargar el mapa. Usa “Abrir en Google Maps”.</div>'; });
  }

  /* ---------------- galería ---------------- */
  var lbI = 0, lbFocus = null;
  function abrirGaleria(i) { lbFocus = document.activeElement; lbI = i; $("#lightbox").hidden = false; pintarGaleriaLb(); $("#lbClose").focus(); }
  function pintarGaleriaLb() {
    var p = S.galeria, f = p.fotos[lbI];
    $("#lbImg").src = img(f.id, 1800); $("#lbImg").alt = f.alt;
    $("#lbCap").textContent = f.alt + " · Foto: " + f.autor + " / Unsplash";
    $("#lbCount").textContent = (lbI + 1) + " / " + p.fotos.length;
  }
  function pasoGaleria(d) { var n = S.galeria.fotos.length; lbI = (lbI + d + n) % n; pintarGaleriaLb(); }
  function cerrarGaleria() { $("#lightbox").hidden = true; if (lbFocus) lbFocus.focus(); }

  function atraparFoco(cont, ev) {
    var f = $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', cont).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var a = f[0], z = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === a) { ev.preventDefault(); z.focus(); }
    else if (!ev.shiftKey && document.activeElement === z) { ev.preventDefault(); a.focus(); }
  }

  /* =========================================================
     RUTAS
     ========================================================= */
  function mostrarVista(v) {
    S.view = v;
    $$(".view").forEach(function (el) { el.hidden = el.dataset.view !== v; });
    document.body.classList.toggle("on-landing", v === "inicio");
    $$(".main-nav a").forEach(function (a) { a.removeAttribute("aria-current"); });
    if (v === "buscar") { var a = $('.main-nav a[href="#buscar"]:not([data-open-map])'); if (a) a.setAttribute("aria-current", "page"); }
    actualizarHeader();
    if (v === "buscar") { iniciarMapa(); if (S.map) setTimeout(function () { S.map.invalidateSize(); }, 50); }
  }
  function ruta() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ""));
    var m = /^propiedad-(\d+)$/.exec(h);
    if (m) {
      if (S.view === "inicio" && !S._rutaInicial) { /* deja la landing detrás */ }
      if (S._rutaInicial === undefined) { mostrarVista("buscar"); aplicar(); }
      S._rutaInicial = false;
      abrirFicha(Number(m[1]));
      return;
    }
    S._rutaInicial = false;
    cerrarFicha();
    if (h === "buscar" || h === "guardadas") {
      S.f.soloGuardadas = h === "guardadas";
      mostrarVista("buscar"); aplicar();
      if (S._abrirMapa) { S._abrirMapa = false; document.body.classList.add("show-map"); $("#mapToggle").setAttribute("aria-pressed", "true"); $("#mapToggle span").textContent = "Lista"; setTimeout(function () { if (S.map) S.map.invalidateSize(); }, 60); }
      window.scrollTo(0, 0);
      return;
    }
    mostrarVista("inicio");
    if (S._scrollA) { var t = document.getElementById(S._scrollA); S._scrollA = null; if (t) setTimeout(function () { t.scrollIntoView({ behavior: "smooth" }); }, 30); }
    else if (h && h !== "inicio") { var el = document.getElementById(h); if (el) el.scrollIntoView(); }
    else window.scrollTo(0, 0);
  }
  function irA(hash) { if (location.hash === hash) ruta(); else location.hash = hash; }

  function actualizarHeader() {
    var top = S.view === "inicio" && window.scrollY < 40 && $("#sheet").hidden;
    $("#siteHeader").classList.toggle("is-top", top);
  }

  /* =========================================================
     EVENTOS
     ========================================================= */
  function eventos() {
    window.addEventListener("hashchange", ruta);
    window.addEventListener("scroll", actualizarHeader, { passive: true });

    $("#menuBtn").addEventListener("click", function () {
      var nav = $("#mainNav"), open = !nav.classList.contains("open");
      nav.classList.toggle("open", open); this.setAttribute("aria-expanded", String(open));
    });
    $("#mainNav").addEventListener("click", function () { this.classList.remove("open"); $("#menuBtn").setAttribute("aria-expanded", "false"); });

    $("#currency").value = S.currency;
    $("#currency").addEventListener("change", function () {
      S.currency = this.value; store.set("hf:moneda", S.currency);
      pintarLanding(); opcionesPrecio(); aplicar(false);
      if (S.fichaId) { var id = S.fichaId; S.fichaId = null; abrirFicha(id); }
      toast("Precios en " + S.currency);
    });

    $("#heroSearch").addEventListener("submit", function (ev) {
      ev.preventDefault();
      S.f = filtrosVacios();
      if ($("#heroZona").value) S.f.zonas = [$("#heroZona").value];
      if ($("#heroTipo").value) S.f.tipos = [$("#heroTipo").value];
      irA("#buscar");
    });
    $("#igMore").addEventListener("click", function () { S.igShown += 9; pintarGaleria(); });

    // clics delegados
    document.addEventListener("click", function (ev) {
      var t = ev.target;
      var el;
      if ((el = t.closest("[data-zona]"))) { S.f = filtrosVacios(); S.f.zonas = [el.dataset.zona]; irA("#buscar"); return; }
      if ((el = t.closest("[data-fav]"))) { ev.preventDefault(); ev.stopPropagation(); toggleFav(Number(el.dataset.fav)); return; }
      if ((el = t.closest(".card-nav"))) { ev.preventDefault(); moverCarrusel(el.closest(".card-media"), Number(el.dataset.step)); return; }
      if ((el = t.closest("[data-open]"))) { irA("#propiedad-" + el.dataset.open); return; }
      if ((el = t.closest("[data-photo]"))) { abrirGaleria(Number(el.dataset.photo)); return; }
      if ((el = t.closest("[data-open-map]"))) { S._abrirMapa = true; return; }
      if ((el = t.closest("[data-scroll]"))) {
        S._scrollA = el.dataset.scroll;
        if (el.dataset.interest) { $("#cInterest").value = el.dataset.interest; }
        if (location.hash === "#inicio" || location.hash === "") { ev.preventDefault(); cerrarFicha(); ruta(); }
        return;
      }
      if ((el = t.closest("[data-pop]"))) { abrirPop(el); return; }
      if ((el = t.closest("[data-seg]"))) { S.f[el.dataset.seg] = Number(el.dataset.v); aplicar(); return; }
      if ((el = t.closest("[data-chip]"))) { S._chips[Number(el.dataset.chip)].quitar(); aplicar(); return; }
      if ((el = t.closest("[data-reset]")) || t.closest("#btnReset")) { var sg = S.f.soloGuardadas && location.hash === "#guardadas"; S.f = filtrosVacios(); if (sg) { irA("#buscar"); } aplicar(); return; }
      if (t.closest("#sheetClose")) { history.length > 1 && S._vinoDeLista ? history.back() : irA("#" + (S.view === "inicio" ? "inicio" : "buscar")); return; }
      if (t.closest("#shareBtn")) { compartir(); return; }
      if (t.id === "sheet") { irA("#" + (S.view === "inicio" ? "inicio" : "buscar")); return; }
      if (popAbierto && !t.closest(".pop") && !t.closest("[data-pop]")) cerrarPop();
    });

    // tarjeta: abrir con clic en cualquier parte (el enlace del título cubre la tarjeta)
    $("#cards").addEventListener("mouseover", function (ev) { var c = ev.target.closest(".card"); if (c) resaltarPin(Number(c.dataset.id), true); });
    $("#cards").addEventListener("mouseout", function (ev) { var c = ev.target.closest(".card"); if (c) resaltarPin(Number(c.dataset.id), false); });

    // filtros
    $("#q").addEventListener("input", debounce(function () { S.f.q = this.value.trim(); aplicar(); }, 200));
    document.addEventListener("change", function (ev) {
      var c = ev.target;
      if (c.dataset && c.dataset.f) {
        var arr = S.f[c.dataset.f];
        if (c.checked && arr.indexOf(c.value) === -1) arr.push(c.value);
        if (!c.checked) S.f[c.dataset.f] = arr.filter(function (x) { return x !== c.value; });
        aplicar();
      }
    });
    $("#fMin").addEventListener("change", function () { S.f.min = Number(this.value); if (S.f.max && S.f.min > S.f.max) S.f.max = 0; aplicar(); });
    $("#fMax").addEventListener("change", function () { S.f.max = Number(this.value); if (S.f.max && S.f.min > S.f.max) S.f.min = 0; aplicar(); });
    $("#sort").addEventListener("change", function () { S.sort = this.value; aplicar(); });
    $("#onlySaved").addEventListener("click", function () { S.f.soloGuardadas = !S.f.soloGuardadas; aplicar(); });
    $("#loadMore").addEventListener("click", function () { S.shown += CONFIG.porPagina; pintarTarjetas(); });
    $("#mapSync").addEventListener("change", function () { if (S.map) S.mapBounds = S.map.getBounds(); pintarTarjetas(); });
    $("#mapToggle").addEventListener("click", function () {
      var on = !document.body.classList.contains("show-map");
      document.body.classList.toggle("show-map", on);
      this.setAttribute("aria-pressed", String(on));
      $("span", this).textContent = on ? "Lista" : "Mapa";
      if (on) { iniciarMapa(); setTimeout(function () { if (S.map) S.map.invalidateSize(); }, 60); }
    });
    window.addEventListener("resize", function () { if (popAbierto) cerrarPop(); });

    // ficha: calculadora
    document.addEventListener("input", function (ev) { if (ev.target.closest && ev.target.closest("#calc") && S.galeria) actualizarCalc(S.galeria); });

    // teclado
    document.addEventListener("keydown", function (ev) {
      if (!$("#lightbox").hidden) {
        if (ev.key === "Escape") { cerrarGaleria(); }
        else if (ev.key === "ArrowRight") pasoGaleria(1);
        else if (ev.key === "ArrowLeft") pasoGaleria(-1);
        else if (ev.key === "Tab") atraparFoco($("#lightbox"), ev);
        return;
      }
      if (!$("#sheet").hidden) {
        if (ev.key === "Escape") { irA("#" + (S.view === "inicio" ? "inicio" : "buscar")); }
        else if (ev.key === "Tab") atraparFoco($("#sheet"), ev);
        return;
      }
      if (popAbierto && ev.key === "Escape") cerrarPop(true);
    });
    $("#lbClose").addEventListener("click", cerrarGaleria);
    $("#lbPrev").addEventListener("click", function () { pasoGaleria(-1); });
    $("#lbNext").addEventListener("click", function () { pasoGaleria(1); });

    // formulario
    $("#contactForm").addEventListener("submit", enviarFormulario);
  }

  function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }

  function compartir() {
    var url = location.href;
    var ok = function () { toast("Enlace copiado"); };
    if (navigator.share) { navigator.share({ title: document.title, url: url }).catch(function () {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { window.prompt("Copia el enlace:", url); });
    else window.prompt("Copia el enlace:", url);
  }

  function enviarFormulario(ev) {
    ev.preventDefault();
    var nombre = $("#cName").value.trim(), tel = $("#cPhone").value.trim(), msg = $("#cMsg").value.trim();
    var okNombre = nombre.length >= 2 && /\p{L}/u.test(nombre);
    var digitos = tel.replace(/[^\d]/g, "");
    var okTel = !tel || (/^[+\d\s().-]+$/.test(tel) && digitos.length >= 10 && digitos.length <= 15);
    $("#cName").setAttribute("aria-invalid", String(!okNombre)); $("#cNameErr").hidden = okNombre;
    $("#cPhone").setAttribute("aria-invalid", String(!okTel)); $("#cPhoneErr").hidden = okTel;
    if (!okNombre) { $("#cName").focus(); return; }
    if (!okTel) { $("#cPhone").focus(); return; }
    var p = S.byId[Number($("#cInterest").value)];
    var texto = "Hola, soy " + nombre + "." + (p ? " Me interesa \"" + p.titulo + "\" (ref. HF-" + p.id + ")." : " Busco una propiedad en la Costa Azul.") + (tel ? " Mi teléfono: " + tel + "." : "") + (msg ? " " + msg : "");
    var url = waLink(texto.slice(0, 900));
    var w = window.open(url, "_blank");
    if (w) { try { w.opener = null; } catch (e) { /* ignorar */ } }
    $("#formStatus").innerHTML = w ? "Abrimos WhatsApp con tu mensaje. Si no se abrió, <a href=\"" + esc(url) + "\" target=\"_blank\" rel=\"noopener\">ábrelo aquí</a>." : "Tu navegador bloqueó la ventana. <a href=\"" + esc(url) + "\" target=\"_blank\" rel=\"noopener\">Abre WhatsApp aquí</a>.";
  }

  /* =========================================================
     ARRANQUE
     ========================================================= */
  function arrancar(data) {
    S.props = data.propiedades;
    S.props.forEach(function (p) { S.byId[p.id] = p; });
    S.tags = PriceTags.calcularEtiquetasPrecio(S.props);
    S.zonas = uniq(S.props.map(function (p) { return p.zona; }));
    if (data.tipoCambioRespaldo) S.rates = { EUR_MXN: data.tipoCambioRespaldo.EUR_MXN, EUR_USD: data.tipoCambioRespaldo.EUR_USD, fecha: data.tipoCambioRespaldo.fecha, fuente: "tipo de cambio de respaldo" };
    var guardado = store.get("hf:filtros", null);
    if (guardado && guardado.f) { S.f = Object.assign(filtrosVacios(), guardado.f, { soloGuardadas: false }); S.sort = guardado.sort || S.sort; }
    S.favs = S.favs.filter(function (id) { return S.byId[id]; });
    $("#contactPhone").textContent = CONFIG.whatsappVisible + " (demo)";
    $("#contactEmail").textContent = CONFIG.email;
    pintarFx();
    construirFiltros();
    pintarContador();
    pintarLanding();
    eventos();
    if (!location.hash) S._rutaInicial = false;
    ruta();
    cargarTipoCambio().then(function () { pintarLanding(); opcionesPrecio(); if (S.view === "buscar") aplicar(false); });
  }

  function errorCarga() {
    $("#main").innerHTML = '<div class="wrap band"><div class="empty"><h2>No pudimos cargar las propiedades</h2><p>Revisa tu conexión y vuelve a intentarlo.</p><button class="btn btn-ink" type="button" id="retryLoad">Reintentar</button></div></div>';
    $("#retryLoad").addEventListener("click", function () { location.reload(); });
  }

  // estado de carga
  $("#cards").innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
  fetch("data/propiedades.json")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(arrancar)
    .catch(function (e) { console.error(e); errorCarga(); });
})();
