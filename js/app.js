/* =========================================================
   Azur — villas en renta en la Costa Azul (sin frameworks ni build)
   Rutas por hash: #inicio · #guardadas · #propiedad-<id>
   ========================================================= */
(function () {
  "use strict";

  var CONFIG = {
    whatsapp: "33612345678",        // DEMO: reemplazar por el número real (código de país + número)
    fxCacheHoras: 12,
    fxTimeoutMs: 4000
  };

  /* ---------------- utilidades ---------------- */
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };
  function img(id, w) { return "https://images.unsplash.com/photo-" + encodeURIComponent(id) + "?auto=format&fit=crop&w=" + w + "&q=72"; }
  function srcset(id, ws) { return ws.map(function (w) { return img(id, w) + " " + w + "w"; }).join(", "); }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  var nf = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
  var nf1 = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  var SYM = { MXN: "$", EUR: "€", USD: "US$" };
  var ICON_HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.5 0 5.4 3.5 4.1 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z"/></svg>';

  /* ---------------- estado ---------------- */
  var S = {
    props: [], byId: {}, tags: {}, zonas: [],
    rates: { EUR_MXN: 21.52, EUR_USD: 1.096, fecha: "", fuente: "respaldo" },
    currency: store.get("hf:moneda", "MXN"),
    favs: store.get("hf:guardadas", []),
    zona: "", sort: "destacadas", modo: "lista", soloGuardadas: false,
    map: null, markers: [], mapState: "idle", miniMap: null, fichaId: null, galeria: null,
    renta: Finance.RENTA_DEFAULT
  };
  function noche(p, temporada) { return Finance.tarifaNoche(p.precio, temporada, S.renta); }

  function money(eur, compact) {
    var v = Finance.convertir(eur, S.currency, S.rates);
    if (compact && v >= 1e6) return SYM[S.currency] + nf1.format(v / 1e6) + " M";
    return SYM[S.currency] + nf.format(v) + (S.currency === "MXN" && !compact ? " MXN" : "");
  }
  function moneyCorto(eur) {
    var v = Finance.convertir(eur, S.currency, S.rates), sym = SYM[S.currency];
    if (v >= 1e6) return sym + nf1.format(v / 1e6) + " M";
    if (v >= 1e4) return sym + nf.format(Math.round(v / 1e3)) + " mil";
    return sym + nf.format(v);
  }
  function moneyM2(eur) { return money(eur).replace(" MXN", "") + "/m²"; }

  /* ---------------- tipo de cambio: API Frankfurter (S16) ---------------- */
  function fetchJSON(url, ms) {
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () { if (ctrl) ctrl.abort(); }, ms);
    return fetch(url, ctrl ? { signal: ctrl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .finally(function () { clearTimeout(t); });
  }
  function cargarTipoCambio() {
    var cache = store.get("hf:fx", null);
    if (cache && Date.now() - cache.t < CONFIG.fxCacheHoras * 3600e3) { S.rates = cache.rates; pintarFx(); return Promise.resolve(); }
    // https://frankfurter.dev — GET /v2/rate/{base}/{quote} -> { date, base, quote, rate }
    return Promise.all([
      fetchJSON("https://api.frankfurter.dev/v2/rate/eur/mxn", CONFIG.fxTimeoutMs),
      fetchJSON("https://api.frankfurter.dev/v2/rate/eur/usd", CONFIG.fxTimeoutMs)
    ]).then(function (r) {
      var mxn = Number(r[0] && r[0].rate), usd = Number(r[1] && r[1].rate);
      if (!(mxn > 0) || !(usd > 0)) throw new Error("sin tipo de cambio");
      S.rates = { EUR_MXN: mxn, EUR_USD: usd, fecha: r[0].date || "", fuente: "Frankfurter (BCE)" };
      store.set("hf:fx", { t: Date.now(), rates: S.rates });
    }).catch(function () { /* se queda el tipo de cambio de respaldo */ }).then(pintarFx);
  }
  function pintarFx() {
    var r = S.rates;
    $("#fxNote").textContent = "Precios de origen en euros. Tipo de cambio: 1 EUR = $" + r.EUR_MXN.toFixed(2) + " MXN = US$" + r.EUR_USD.toFixed(3) + " (" + r.fuente + (r.fecha ? ", " + r.fecha : "") + ").";
  }

  /* ---------------- helpers de propiedad ---------------- */
  function tagClass(e) { return !e || !e.etiqueta ? "tag-none" : e.etiqueta === "Buena oportunidad" ? "tag-op" : e.etiqueta === "Precio alto" ? "tag-hi" : "tag-ok"; }
  function tagText(e) {
    if (!e || !e.etiqueta) return "Sin comparables";
    var d = (e.diferenciaPct > 0 ? "+" : "") + e.diferenciaPct + " %";
    return (e.etiqueta === "Precio en rango" ? "En rango" : e.etiqueta) + " · " + d;
  }
  // Función del Assignment 2, mostrada como nota discreta (sin insignias de color).
  function tagHTML(p) {
    var e = S.tags[p.id];
    if (!e || !e.etiqueta) return '<span class="zone-note">Sin otras villas en su zona para comparar</span>';
    var d = Math.abs(e.diferenciaPct), rel = d === 0 ? "igual que su zona" : d + " % " + (e.diferenciaPct < 0 ? "bajo" : "sobre") + " su zona";
    var lbl = e.etiqueta === "Precio en rango" ? "En rango" : e.etiqueta;
    return '<span class="zone-note" title="Valor por m² frente al promedio de ' + esc(p.zona) + '"><b>' + esc(lbl) + "</b> · " + esc(rel) + "</span>";
  }
  function specsTexto(p) {
    if (p.tipo === "Terreno") return "Terreno de " + nf.format(p.terreno) + " m²";
    return p.recamaras + " recámaras · " + p.banos + " baños · " + nf.format(p.m2) + " m²";
  }
  function isFav(id) { return S.favs.indexOf(id) > -1; }
  function toggleFav(id) {
    var i = S.favs.indexOf(id);
    if (i > -1) S.favs.splice(i, 1); else S.favs.push(id);
    store.set("hf:guardadas", S.favs);
    $("#savedCount").textContent = S.favs.length;
    $$('[data-fav="' + id + '"]').forEach(function (b) { b.setAttribute("aria-pressed", String(isFav(id))); });
    toast(isFav(id) ? "Guardada" : "Quitada de guardadas");
    if (S.soloGuardadas) pintarLista();
  }
  var toastT;
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2200); }
  function waLink(msg) { return "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(msg); }

  // foto que no carga -> reemplazo neutro (no aplica a las teselas del mapa)
  var PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#F1F3F7"/><path d="M170 160 200 135l30 25v35h-20v-20h-20v20h-20z" fill="none" stroke="#C9CFD9" stroke-width="4" stroke-linejoin="round"/></svg>');
  document.addEventListener("error", function (ev) {
    var t = ev.target;
    if (t && t.tagName === "IMG" && t.src !== PLACEHOLDER && !t.classList.contains("leaflet-tile")) { t.removeAttribute("srcset"); t.src = PLACEHOLDER; }
  }, true);

  /* =========================================================
     INICIO: portada + colección
     ========================================================= */
  function destacada() { return S.props.slice().sort(function (a, b) { return b.precio - a.precio; })[0]; }

  function pintarPortada() {
    var p = destacada(), f = p.fotos[0];
    $("#cover").innerHTML =
      '<img src="' + img(f.id, 1600) + '" srcset="' + srcset(f.id, [1000, 1600, 2400]) + '" sizes="100vw" alt="' + esc(f.alt) + '" fetchpriority="high">' +
      '<div class="cover-inner wrap"><div>' +
        '<p class="cover-kicker">' + esc(p.comuna) + "</p>" +
        "<h1>" + esc(p.titulo) + "</h1>" +
        '<p class="cover-meta">Desde ' + money(noche(p, "baja"), true) + " por noche · " + esc(specsTexto(p)) + "</p>" +
      '</div><a class="btn btn-light" href="#propiedad-' + p.id + '">Ver la villa</a></div>';
  }

  var ORDEN = {
    destacadas: function (a, b) { return b.precio - a.precio; },
    recomendadas: function (a, b) { var x = S.tags[a.id].diferenciaPct, y = S.tags[b.id].diferenciaPct; return (x == null ? 999 : x) - (y == null ? 999 : y); },
    "precio-asc": function (a, b) { return a.precio - b.precio; },
    recientes: function (a, b) { return b.publicado.localeCompare(a.publicado); }
  };
  function visibles() {
    return S.props.filter(function (p) {
      if (S.zona && p.zona !== S.zona) return false;
      if (S.soloGuardadas && !isFav(p.id)) return false;
      return true;
    }).sort(ORDEN[S.sort] || ORDEN.destacadas);
  }

  function pintarZonas() {
    var btn = function (v, t) { return '<button type="button" data-zona="' + esc(v) + '" aria-pressed="' + (S.zona === v) + '">' + esc(t) + "</button>"; };
    $("#zones").innerHTML = btn("", "Todas") + S.zonas.map(function (z) { return btn(z, z); }).join("");
  }

  function cardHTML(p, wide) {
    var fotos = p.fotos;
    var w = wide ? [1000, 1600, 2400] : [600, 900, 1300];
    var sizes = wide ? "(max-width: 720px) 100vw, 1200px" : "(max-width: 720px) 100vw, 600px";
    return '<article class="card' + (wide ? " wide" : "") + '" data-id="' + p.id + '">' +
      '<div class="card-media" data-i="0">' +
        '<div class="card-track">' + fotos.map(function (f, i) {
          return '<img src="' + img(f.id, w[1]) + '" srcset="' + srcset(f.id, w) + '" sizes="' + sizes + '" alt="' + esc(f.alt) + '"' + (i ? ' loading="lazy"' : "") + ' decoding="async">';
        }).join("") + "</div>" +
        (fotos.length > 1 ?
          '<button class="card-nav prev" type="button" data-step="-1" aria-label="Foto anterior"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>' +
          '<button class="card-nav next" type="button" data-step="1" aria-label="Foto siguiente"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></button>' +
          '<span class="card-count">1 / ' + fotos.length + "</span>" : "") +
        '<button class="fav" type="button" data-fav="' + p.id + '" aria-pressed="' + isFav(p.id) + '" aria-label="Guardar ' + esc(p.titulo) + '">' + ICON_HEART + "</button>" +
      "</div>" +
      '<div class="card-body">' +
        '<p class="card-price">Desde ' + money(noche(p, "baja"), true) + " <small>por noche</small></p>" +
        '<h3 class="card-title"><a href="#propiedad-' + p.id + '">' + esc(p.titulo) + "</a></h3>" +
        '<p class="card-meta">' + esc(p.comuna) + " · " + esc(specsTexto(p)) + "</p>" + tagHTML(p) +
      "</div></article>";
  }

  function pintarLista() {
    var lista = visibles();
    $("#resultCount").textContent = lista.length === 1 ? "1 villa" : lista.length + " villas";
    if (!lista.length) {
      $("#grid").innerHTML = '<div class="empty"><h2>' + (S.soloGuardadas ? "Aún no guardas ninguna" : "Sin villas en esta zona") + "</h2><p>" +
        (S.soloGuardadas ? "Toca el corazón de una casa para tenerla a la mano." : "Prueba con otra zona.") +
        '</p><a class="btn btn-line" href="#inicio" data-todas>Ver todas las villas</a></div>';
    } else {
      $("#grid").innerHTML = lista.map(function (p, i) { return cardHTML(p, i === 0 && lista.length > 2); }).join("");
    }
    if (S.modo === "mapa") pintarMarcadores();
  }

  function moverCarrusel(media, step) {
    var n = $$(".card-track img", media).length;
    var i = (Number(media.dataset.i) + step + n) % n;
    media.dataset.i = i;
    $(".card-track", media).style.transform = "translateX(" + (-100 * i) + "%)";
    var c = $(".card-count", media); if (c) c.textContent = (i + 1) + " / " + n;
  }

  /* =========================================================
     MAPA: mapa real (OpenStreetMap) en tonos claros, pines de precio
     separados entre sí y vista previa de la casa al pasar el mouse.
     ========================================================= */
  var leafletPromise = null;
  function cargarLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletPromise) return leafletPromise;
    leafletPromise = new Promise(function (ok, fail) {
      var css = document.createElement("link"); css.rel = "stylesheet"; css.href = "vendor/leaflet/leaflet.css"; document.head.appendChild(css);
      var s = document.createElement("script"); s.src = "vendor/leaflet/leaflet.js";
      s.onload = function () { window.L ? ok(window.L) : fail(new Error("Leaflet")); };
      s.onerror = function () { fail(new Error("Leaflet")); };
      document.head.appendChild(s);
    });
    return leafletPromise;
  }
  function capaMapa(L, map, onFail) {
    var errores = 0, cargadas = 0;
    var capa = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, className: "tiles-claras",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
    capa.on("tileload", function () { cargadas++; });
    capa.on("tileerror", function () { errores++; if (errores >= 4 && !cargadas && onFail) { onFail(); onFail = null; } });
    capa.addTo(map);
  }
  function pinIcon(L, p) {
    return L.divIcon({ className: "pin", html: '<span class="pin-label">' + moneyCorto(noche(p, "baja")) + "</span>", iconSize: [0, 0], iconAnchor: [0, 0] });
  }
  function popupHTML(p) {
    var f = p.fotos[0];
    return '<div class="pop-card"><img src="' + img(f.id, 560) + '" alt=""><div>' +
      "<strong>Desde " + money(noche(p, "baja"), true) + " / noche</strong>" +
      "<small>" + esc(p.titulo) + "</small><small>" + esc(specsTexto(p)) + "</small>" +
      '<button type="button" data-open="' + p.id + '">Ver la villa</button></div></div>';
  }

  // Separa etiquetas que se encimarían: las ordena por posición y empuja hacia arriba
  // las que chocan con una ya colocada; una línea fina las une con su punto real.
  function separarPines() {
    if (!S.map) return;
    var colocadas = [];
    var items = S.markers.map(function (m) { return { m: m, pt: S.map.latLngToContainerPoint(m.getLatLng()) }; })
      .sort(function (a, b) { return b.pt.y - a.pt.y || a.pt.x - b.pt.x; });
    items.forEach(function (it) {
      var el = it.m.getElement(); if (!el) return;
      var lab = el.querySelector(".pin-label");
      var w = lab.offsetWidth || 70, h = 28, dy = 0;
      var rect = function () { return { x1: it.pt.x - w / 2, x2: it.pt.x + w / 2, y1: it.pt.y - 14 - h - dy, y2: it.pt.y - 14 - dy }; };
      var r = rect(), choca = true, intentos = 0;
      while (choca && intentos < 12) {
        choca = colocadas.some(function (c) { return r.x1 < c.x2 + 4 && r.x2 > c.x1 - 4 && r.y1 < c.y2 + 4 && r.y2 > c.y1 - 4; });
        if (choca) { dy += h + 6; r = rect(); intentos++; }
      }
      colocadas.push(r);
      el.style.setProperty("--dy", dy + "px");
      el.classList.toggle("is-lifted", dy > 0);
    });
  }

  function iniciarMapa() {
    if (S.mapState !== "idle") { if (S.map) { S.map.invalidateSize(); pintarMarcadores(); } return; }
    S.mapState = "loading";
    cargarLeaflet().then(function (L) {
      S.map = L.map("map", { scrollWheelZoom: false, zoomControl: true, zoomSnap: 0.5 });
      capaMapa(L, S.map, mapaRespaldo);
      S.map.on("zoomend", function () {
        if (S._pintando) return;
        var debeZonas = S.map.getZoom() < ZOOM_DETALLE && !S.zona;
        if (debeZonas !== S.vistaZonas) pintarMarcadores(true); else separarPines();
      });
      S.map.on("moveend", separarPines);
      S.mapState = "ready";
      pintarMarcadores();
    }).catch(mapaRespaldo);
  }
  var ZOOM_DETALLE = 11;
  function pintarMarcadores(sinEncuadre) {
    if (S.mapState === "fallback") { mapaRespaldo(); return; }
    if (S.mapState !== "ready") return;
    var L = window.L, lista = visibles();
    S.markers.forEach(function (m) { S.map.removeLayer(m); });
    if (!sinEncuadre) {
      var pts0 = (lista.length ? lista : S.props).map(function (p) { return [p.lat, p.lng]; });
      S._pintando = true;
      S.map.fitBounds(L.latLngBounds(pts0), { padding: [70, 70], maxZoom: 13, animate: false });
      S._pintando = false;
    }
    S.vistaZonas = S.map.getZoom() < ZOOM_DETALLE && !S.zona;
    if (S.vistaZonas) {
      // Vista general: un marcador por zona; al tocarlo, acerca a sus villas.
      S.markers = uniq(lista.map(function (p) { return p.zona; })).map(function (z) {
        var ps = lista.filter(function (p) { return p.zona === z; });
        var lat = ps.reduce(function (a, p) { return a + p.lat; }, 0) / ps.length, lng = ps.reduce(function (a, p) { return a + p.lng; }, 0) / ps.length;
        var desde = Math.min.apply(null, ps.map(function (p) { return noche(p, "baja"); }));
        var m = L.marker([lat, lng], { icon: L.divIcon({ className: "pin pin-zona", html: '<span class="pin-label"><b>' + esc(z) + "</b> " + ps.length + " villas · desde " + moneyCorto(desde) + "</span>", iconSize: [0, 0], iconAnchor: [0, 0] }), title: z, keyboard: true });
        m.on("click", function () { S.map.fitBounds(L.latLngBounds(ps.map(function (p) { return [p.lat, p.lng]; })), { padding: [80, 80], maxZoom: 15 }); });
        return m.addTo(S.map);
      });
      setTimeout(separarPines, 30);
      return;
    }
    S.markers = lista.map(function (p) {
      var m = L.marker([p.lat, p.lng], { icon: pinIcon(L, p), title: p.titulo, riseOnHover: true, keyboard: true });
      m.bindPopup(popupHTML(p), { closeButton: false, offset: [0, -34], autoPan: false, className: "pop-hover" });
      var cerrarT;
      m.on("mouseover", function () {
        clearTimeout(cerrarT); m.openPopup();
        var pop = m.getPopup().getElement();
        if (pop && !pop._hf) {
          pop._hf = true;
          pop.addEventListener("mouseenter", function () { clearTimeout(cerrarT); });
          pop.addEventListener("mouseleave", function () { cerrarT = setTimeout(function () { m.closePopup(); }, 250); });
        }
      });
      m.on("mouseout", function () { cerrarT = setTimeout(function () { m.closePopup(); }, 350); });
      m.on("click", function () { m.openPopup(); });
      return m.addTo(S.map);
    });
    setTimeout(separarPines, 30);
  }
  function mapaRespaldo() {
    // Si el servicio de mapas no responde: mapa esquemático de la costa con las propiedades.
    S.mapState = "fallback";
    var lista = visibles();
    var X = function (lng) { return ((lng - 6.5) / 1.05) * 1000; }, Y = function (lat) { return (1 - (lat - 43.15) / 0.67) * 700; };
    $("#map").innerHTML = '<div class="map-fallback"><svg viewBox="0 0 1000 700" role="img" aria-label="Mapa esquemático de la Costa Azul">' +
      '<rect width="1000" height="700" fill="#E9EDF3"/><path d="M0 0H1000V330C930 300 880 250 820 270 760 290 720 230 640 250 580 265 520 300 470 330 420 360 380 420 330 430 280 440 230 470 170 520 110 560 60 600 0 620Z" fill="#fff"/>' +
      lista.map(function (p) { return '<a href="#propiedad-' + p.id + '"><circle cx="' + X(p.lng).toFixed(0) + '" cy="' + Y(p.lat).toFixed(0) + '" r="10" fill="#0F1E3D" stroke="#fff" stroke-width="3"><title>' + esc(p.titulo + " — desde " + money(noche(p, "baja"), true) + " por noche") + "</title></circle></a>"; }).join("") +
      '<text x="24" y="680" fill="#5B667A" font-size="18" font-family="sans-serif">Mapa esquemático: el mapa detallado no está disponible ahora.</text></svg></div>';
  }

  function cambiarModo(m) {
    S.modo = m;
    $$(".view-switch button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.mode === m)); });
    $("#grid").hidden = m !== "lista";
    $("#mapWrap").hidden = m !== "mapa";
    if (m === "mapa") iniciarMapa();
  }

  /* =========================================================
     FICHA
     ========================================================= */
  var lastFocus = null;
  function abrirFicha(id) {
    var p = S.byId[id];
    if (!p) { location.hash = "#inicio"; return; }
    if (S.fichaId === id && !$("#sheet").hidden) return;
    if ($("#sheet").hidden) lastFocus = document.activeElement;
    S.fichaId = id; S.galeria = p;
    var e = S.tags[p.id];
    var comps = PriceTags.comparablesDe(p, S.props);
    var f0 = p.fotos[0];
    var pos = e.diferenciaPct == null ? 50 : Math.max(3, Math.min(97, 50 + e.diferenciaPct));
    var specs = p.tipo === "Terreno"
      ? [[nf.format(p.terreno) + " m²", "terreno"], [p.vista, "vista"]]
      : [[p.recamaras, "recámaras"], [p.banos + (p.mediosBanos ? "½" : ""), "baños"], [nf.format(p.m2) + " m²", "construcción"], [p.terreno ? nf.format(p.terreno) + " m²" : "—", "terreno"]];
    var facts = [
      ["Valor de la propiedad", money(p.precio)],
      ["Valor por m²", e.precioM2 ? moneyM2(e.precioM2) : "—"],
      ["Tipo", p.tipo === "Casa" ? "Villa" : p.tipo],
      ["Año", p.anio || "—"],
      ["Niveles", p.niveles || "—"],
      ["Estacionamientos", p.estacionamientos || "—"],
      ["Vista", p.vista],
      ["Distancia al mar", p.distanciaMar === 0 ? "Frente al mar" : nf.format(p.distanciaMar) + " m"],
      ["Aeropuerto de Niza", p.distanciaAeropuerto + " km"],
      ["Seguridad", p.seguridad]
    ];
    var analysis = e.etiqueta
      ? '<div class="analysis"><p class="analysis-head">' + esc(e.etiqueta === "Precio en rango" ? "En rango" : e.etiqueta) + ": " + Math.abs(e.diferenciaPct) + " % " + (e.diferenciaPct < 0 ? "bajo" : "sobre") + " el promedio de " + esc(p.zona) + '</p><div class="analysis-top"><p>' + moneyM2(e.precioM2) + " frente a " + moneyM2(e.promedioComparables) + " de promedio por m²</p></div>" +
        '<div class="scale" role="img" aria-label="' + Math.abs(e.diferenciaPct) + " % " + (e.diferenciaPct < 0 ? "por debajo" : "por encima") + ' del promedio de su zona"><span class="scale-mid"></span><span class="scale-mark" style="left:' + pos.toFixed(1) + '%"><span>' + (e.diferenciaPct > 0 ? "+" : "") + e.diferenciaPct + " %</span></span></div>" +
        '<div class="scale-labels"><span>Más barata</span><span>Promedio de ' + esc(p.zona) + "</span><span>Más cara</span></div>" +
        '<div class="comps">' + comps.map(function (c) { return '<button class="comp" type="button" data-open="' + c.id + '"><span>' + esc(c.titulo) + "</span><b>" + moneyM2(PriceTags.precioM2(c)) + "</b></button>"; }).join("") + "</div>" +
        '<p class="credit">Valor por m² comparado con ' + e.numComparables + " villa" + (e.numComparables > 1 ? "s" : "") + " de " + esc(p.zona) + ". Con pocas comparables, cada una pesa mucho en el promedio.</p></div>"
      : '<div class="analysis"><p>' + esc(e.motivo) + ".</p></div>";

    $("#sheetPanel").innerHTML =
      '<div class="sheet-top">' +
        '<button class="back" type="button" id="sheetClose"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>Volver</button>' +
        '<button class="icon-btn" type="button" data-fav="' + p.id + '" aria-pressed="' + isFav(p.id) + '" aria-label="Guardar">' + ICON_HEART + "</button>" +
        '<button class="icon-btn" type="button" id="shareBtn" aria-label="Copiar enlace"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg></button>' +
      "</div>" +
      '<div class="sheet-inner">' +
        '<div class="hero-photo"><button class="open" type="button" data-photo="0" aria-label="Ver fotos"><img src="' + img(f0.id, 1600) + '" srcset="' + srcset(f0.id, [1000, 1600, 2400]) + '" sizes="(max-width: 1240px) 100vw, 1200px" alt="' + esc(f0.alt) + '"></button>' +
          '<button class="btn btn-light all" type="button" data-photo="0">Ver las ' + p.fotos.length + " fotos</button></div>" +
        '<div class="thumbs">' + p.fotos.slice(1).map(function (f, i) { return '<button type="button" data-photo="' + (i + 1) + '" aria-label="Foto ' + (i + 2) + '"><img src="' + img(f.id, 500) + '" alt="' + esc(f.alt) + '" loading="lazy"></button>'; }).join("") + "</div>" +
        '<div class="sheet-cols"><div class="sheet-main">' +
          '<div class="s-head"><h2 id="sheetTitle">' + esc(p.titulo) + '</h2><p class="s-loc">' + esc(p.comuna + ", " + p.departamento) + "</p>" +
            '<div class="s-specs">' + specs.map(function (s) { return "<div><b>" + esc(s[0]) + "</b><span>" + esc(s[1]) + "</span></div>"; }).join("") + "</div></div>" +
          '<section class="s-section"><p>' + esc(p.descripcion) + "</p></section>" +
          '<section class="s-section"><h3>Valor frente a su zona</h3>' + analysis + "</section>" +
          '<section class="s-section"><h3>Detalles</h3><dl class="facts">' + facts.map(function (x) { return "<div><dt>" + esc(x[0]) + "</dt><dd>" + esc(x[1]) + "</dd></div>"; }).join("") + "</dl></section>" +
          '<section class="s-section"><h3>Lo que incluye</h3><ul class="amen">' + p.amenidades.concat(p.destacados).map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ul></section>" +
          '<section class="s-section"><h3>Ubicación</h3><div class="mini-map" id="miniMap"></div><p class="credit loc-note">Ubicación aproximada. <a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.lat + "," + p.lng) + '" target="_blank" rel="noopener">Abrir en Google Maps</a></p></section>' +
          '<p class="credit">Fotos ilustrativas de Unsplash: ' + esc(uniq(p.fotos.map(function (f) { return f.autor; })).join(", ")) + ".</p>" +
        "</div>" +
        '<aside class="aside">' + quoteHTML(p) + "</aside>" +
      "</div></div>";

    $("#sheet").hidden = false;
    $("#sheet").scrollTop = 0;
    document.body.classList.add("no-scroll");
    $("#sheetClose").focus();
    actualizarCotizacion();
    miniMapa(p);
  }
  function cerrarFicha() {
    if ($("#sheet").hidden) return;
    $("#sheet").hidden = true;
    document.body.classList.remove("no-scroll");
    if (S.miniMap) { S.miniMap.remove(); S.miniMap = null; }
    S.fichaId = null;
    if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
  }

  /* cotizador de renta: tarifa por temporada, mínimo de noches */
  function isoHoy(offset) { var d = new Date(Date.now() + (offset || 0) * 864e5); return d.toISOString().slice(0, 10); }
  function quoteHTML(p) {
    var r = function (t, n) { return "<div><dt>" + n + "</dt><dd>" + money(noche(p, t), true) + "</dd></div>"; };
    return '<div class="quote" id="quote">' +
      '<p class="aside-price">' + money(noche(p, "baja"), true) + " <small>por noche, desde</small></p>" +
      '<dl class="rates">' + r("alta", "Alta · jun–sep") + r("media", "Media · abr, may, oct") + r("baja", "Baja · nov–mar") + "</dl>" +
      '<div class="dates"><label>Llegada<input type="date" id="qIn" min="' + isoHoy(1) + '"></label><label>Salida<input type="date" id="qOut" min="' + isoHoy(6) + '"></label></div>' +
      '<div class="quote-out" id="qOutBox" aria-live="polite"><p class="quote-err">Elige tus fechas. Estancia mínima: ' + S.renta.minNoches + " noches.</p></div>" +
      '<a class="btn btn-solid btn-block" id="qBook" aria-disabled="true" target="_blank" rel="noopener" href="#">Solicitar reserva</a>' +
      '<button class="btn btn-line btn-block" type="button" data-fav="' + p.id + '" aria-pressed="' + isFav(p.id) + '">Guardar</button>' +
      '<p class="credit">Tarifa = valor de la villa × tasa mensual de la temporada (alta 6 %, media 4 %, baja 3 %) ÷ 30. Ref. AZ-' + p.id + "</p></div>";
  }
  function actualizarCotizacion() {
    var p = S.galeria, a = $("#qIn"), b = $("#qOut");
    if (!p || !a) return;
    if (a.value) { var minSalida = new Date(Date.parse(a.value) + S.renta.minNoches * 864e5).toISOString().slice(0, 10); b.min = minSalida; }
    var box = $("#qOutBox"), book = $("#qBook");
    if (!a.value || !b.value) { box.innerHTML = '<p class="quote-err">Elige tus fechas. Estancia mínima: ' + S.renta.minNoches + " noches.</p>"; book.setAttribute("aria-disabled", "true"); book.href = "#"; return; }
    var q = Finance.cotizar(p.precio, a.value, b.value, S.renta);
    if (!q.ok) { box.innerHTML = '<p class="quote-err">' + esc(q.error) + "</p>"; book.setAttribute("aria-disabled", "true"); book.href = "#"; return; }
    var nombres = { alta: "Alta", media: "Media", baja: "Baja" };
    box.innerHTML = ["alta", "media", "baja"].filter(function (k) { return q.desglose[k].noches; }).map(function (k) {
      var d = q.desglose[k];
      return '<p class="line"><span>' + nombres[k] + ": " + d.noches + " × " + money(d.tarifa, true) + "</span><span>" + money(d.subtotal, true) + "</span></p>";
    }).join("") + '<p class="total"><span>' + q.noches + " noches</span><span>" + money(q.total) + "</span></p>";
    book.setAttribute("aria-disabled", "false");
    book.href = waLink("Hola, quiero reservar \"" + p.titulo + "\" (ref. AZ-" + p.id + ") del " + a.value + " al " + b.value + ": " + q.noches + " noches, total cotizado " + money(q.total) + ".");
  }
  function miniMapa(p) {
    var el = $("#miniMap");
    var falla = function () { el.innerHTML = '<div class="map-fallback">El mapa no está disponible ahora. Usa “Abrir en Google Maps”.</div>'; };
    cargarLeaflet().then(function (L) {
      if (!document.body.contains(el)) return;
      var m = L.map(el, { scrollWheelZoom: false }).setView([p.lat, p.lng], 13);
      capaMapa(L, m, falla);
      L.circle([p.lat, p.lng], { radius: 400, color: "#0F1E3D", weight: 1.5, fillColor: "#0F1E3D", fillOpacity: .12 }).addTo(m);
      S.miniMap = m;
    }).catch(falla);
  }

  /* galería */
  var lbI = 0, lbFocus = null;
  function abrirGaleria(i) { lbFocus = document.activeElement; lbI = i; $("#lightbox").hidden = false; pintarLb(); $("#lbClose").focus(); }
  function pintarLb() {
    var f = S.galeria.fotos[lbI];
    $("#lbImg").src = img(f.id, 2000); $("#lbImg").alt = f.alt;
    $("#lbCap").textContent = f.alt + " · Foto: " + f.autor + " / Unsplash";
    $("#lbCount").textContent = (lbI + 1) + " / " + S.galeria.fotos.length;
  }
  function pasoLb(d) { var n = S.galeria.fotos.length; lbI = (lbI + d + n) % n; pintarLb(); }
  function cerrarGaleria() { $("#lightbox").hidden = true; if (lbFocus) lbFocus.focus(); }
  function atraparFoco(cont, ev) {
    var f = $$('a[href], button:not([disabled]), input, select, summary, [tabindex]:not([tabindex="-1"])', cont).filter(function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    if (ev.shiftKey && document.activeElement === f[0]) { ev.preventDefault(); f[f.length - 1].focus(); }
    else if (!ev.shiftKey && document.activeElement === f[f.length - 1]) { ev.preventDefault(); f[0].focus(); }
  }

  /* =========================================================
     RUTAS Y EVENTOS
     ========================================================= */
  var vieneDeLista = false;
  function ruta() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ""));
    var m = /^propiedad-(\d+)$/.exec(h);
    if (m) { abrirFicha(Number(m[1])); return; }
    cerrarFicha();
    var antes = S.soloGuardadas;
    S.soloGuardadas = h === "guardadas";
    $("#cover").hidden = S.soloGuardadas;
    $("#pageTitle").textContent = S.soloGuardadas ? "Guardadas" : "Villas";
    if (antes !== S.soloGuardadas) pintarLista();
    if (S.soloGuardadas) window.scrollTo(0, 0);
  }
  function cerrarConHistoria() {
    if (vieneDeLista) history.back();
    else location.hash = S.soloGuardadas ? "#guardadas" : "#inicio";
  }

  function eventos() {
    var previa = location.hash;
    window.addEventListener("hashchange", function () {
      vieneDeLista = /^#propiedad-/.test(location.hash) && !/^#propiedad-/.test(previa) ? true : (/^#propiedad-/.test(location.hash) ? vieneDeLista : false);
      previa = location.hash;
      ruta();
    });
    $("#currency").value = S.currency;
    $("#currency").addEventListener("change", function () {
      S.currency = this.value; store.set("hf:moneda", S.currency);
      pintarPortada(); pintarLista();
      if (S.fichaId) { var id = S.fichaId; S.fichaId = null; abrirFicha(id); }
    });
    $("#sort").value = "precio-desc";
    $("#sort").addEventListener("change", function () { S.sort = this.value === "precio-desc" ? "destacadas" : this.value; pintarLista(); });

    document.addEventListener("click", function (ev) {
      var t = ev.target, el;
      if ((el = t.closest("[data-fav]"))) { ev.preventDefault(); ev.stopPropagation(); toggleFav(Number(el.dataset.fav)); return; }
      if ((el = t.closest(".card-nav"))) { ev.preventDefault(); moverCarrusel(el.closest(".card-media"), Number(el.dataset.step)); return; }
      if ((el = t.closest("[data-zona]"))) { S.zona = el.dataset.zona; pintarZonas(); pintarLista(); return; }
      if ((el = t.closest("[data-mode]"))) { cambiarModo(el.dataset.mode); return; }
      if ((el = t.closest("[data-open]"))) { location.hash = "#propiedad-" + el.dataset.open; return; }
      if ((el = t.closest("[data-photo]"))) { abrirGaleria(Number(el.dataset.photo)); return; }
      if (t.closest("[data-todas]")) { S.zona = ""; pintarZonas(); return; }
      if (t.closest("#sheetClose")) { cerrarConHistoria(); return; }
      if (t.closest("#shareBtn")) { compartir(); return; }
    });
    document.addEventListener("input", function (ev) { if (ev.target.closest && ev.target.closest("#quote")) actualizarCotizacion(); });
    document.addEventListener("change", function (ev) { if (ev.target.closest && ev.target.closest("#quote")) actualizarCotizacion(); });
    document.addEventListener("keydown", function (ev) {
      if (!$("#lightbox").hidden) {
        if (ev.key === "Escape") cerrarGaleria();
        else if (ev.key === "ArrowRight") pasoLb(1);
        else if (ev.key === "ArrowLeft") pasoLb(-1);
        else if (ev.key === "Tab") atraparFoco($("#lightbox"), ev);
        return;
      }
      if (!$("#sheet").hidden) {
        if (ev.key === "Escape") cerrarConHistoria();
        else if (ev.key === "Tab") atraparFoco($("#sheet"), ev);
      }
    });
    $("#lbClose").addEventListener("click", cerrarGaleria);
    $("#lbPrev").addEventListener("click", function () { pasoLb(-1); });
    $("#lbNext").addEventListener("click", function () { pasoLb(1); });
  }

  function compartir() {
    var url = location.href;
    if (navigator.share) { navigator.share({ title: document.title, url: url }).catch(function () {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { toast("Enlace copiado"); }, function () { window.prompt("Copia el enlace:", url); });
    else window.prompt("Copia el enlace:", url);
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
    S.favs = S.favs.filter(function (id) { return S.byId[id]; });
    $("#savedCount").textContent = S.favs.length;
    if (data.renta) S.renta = data.renta;
    $("#closingWa").href = waLink("Hola, quiero rentar una villa con Azur. Mis fechas son: ");
    pintarFx(); pintarPortada(); pintarZonas(); pintarLista(); eventos();
    ruta();
    cargarTipoCambio().then(function () { pintarPortada(); pintarLista(); });
  }
  $("#grid").innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
  fetch("data/propiedades.json")
    .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(arrancar)
    .catch(function () {
      $("#grid").innerHTML = '<div class="empty"><h2>No pudimos cargar las villas</h2><p>Revisa tu conexión y vuelve a intentarlo.</p><button class="btn btn-solid" type="button" id="retryLoad">Reintentar</button></div>';
      $("#retryLoad").addEventListener("click", function () { location.reload(); });
    });
})();
