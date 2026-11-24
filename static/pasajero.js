const _s = exigirRol("pasajero");
const $ = id => document.getElementById(id);
$("quien").textContent = "Hola, " + _s.usuario;

const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let msgT;
function aviso(texto, tipo = "error") {
  const m = $("mensaje");
  m.textContent = texto; m.className = tipo;
  clearTimeout(msgT);
  msgT = setTimeout(() => { m.textContent = ""; m.className = ""; }, 4000);
}

// ---------- Mapa ----------
const mapa = L.map("mapa").setView([19.0414, -98.2063], 13);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(mapa);
const icono = clase => L.divIcon({ className: "", html: `<span class="pin ${clase}"></span>`, iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -26], tooltipAnchor: [14, -13] });
const capaRutas = L.layerGroup().addTo(mapa);
const capaParadas = L.layerGroup().addTo(mapa);
const capaLugar = L.layerGroup().addTo(mapa);

// ---------- Estado ----------
let rutas = [], paradas = [];
let lugar = null;          // [lat, lng] elegido o ubicación del pasajero
let seleccionada = null;   // id de la ruta elegida

// Distancia en metros de un punto a una polilínea (proyección plana, suficiente para una ciudad)
function distanciaARuta(p, linea) {
  const k = Math.cos(p[0] * Math.PI / 180) * 111320, kLat = 110540;
  const xy = q => [(q[1] - p[1]) * k, (q[0] - p[0]) * kLat];
  let mejor = Infinity;
  for (let i = 0; i < linea.length - 1; i++) {
    const [ax, ay] = xy(linea[i]), [bx, by] = xy(linea[i + 1]);
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
    mejor = Math.min(mejor, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return mejor;
}
const distPunto = (a, b) => Math.hypot((a[1] - b[1]) * Math.cos(a[0] * Math.PI / 180) * 111320, (a[0] - b[0]) * 110540);
const fmt = m => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;

// ---------- Datos ----------
async function cargar() {
  try {
    const [r1, r2] = await Promise.all([api("/rutas"), api("/paradas")]);
    rutas = (await r1.json()).rutas;
    paradas = (await r2.json()).paradas.filter(p => p.activa);
    pintar();
  } catch { aviso("No se pudieron cargar las rutas."); }
}

// ---------- Pintar ----------
function pintar() {
  const texto = $("buscar").value.trim().toLowerCase();
  const radio = +$("radio").value;

  let lista = rutas.map(r => ({ ...r, dist: lugar ? distanciaARuta(lugar, r.recorrido) : null }));
  if (texto) lista = lista.filter(r => r.nombre.toLowerCase().includes(texto));
  if (lugar) lista = lista.filter(r => r.dist <= radio).sort((a, b) => a.dist - b.dist);

  $("contador").textContent = lista.length;
  $("titulo-resultados").firstChild.textContent = lugar ? "Rutas cerca de ti " : texto ? "Resultados " : "Todas las rutas ";

  // lista
  const cont = $("resultados");
  cont.innerHTML = lista.length ? "" : `<div class="vacio"><strong>Sin resultados</strong>${lugar ? "Ninguna ruta pasa tan cerca. Prueba con una distancia mayor." : "Prueba con otro nombre."}</div>`;
  lista.forEach(r => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ruta-item" + (r.id === seleccionada ? " activa" : "");
    b.innerHTML = `<span class="punto-color" style="background:${esc(r.color)}"></span><span class="ruta-nombre">${esc(r.nombre)}</span>${r.dist != null ? `<span class="distancia">a ${fmt(r.dist)}</span>` : ""}`;
    b.onclick = () => { seleccionada = seleccionada === r.id ? null : r.id; pintar(); if (seleccionada) encuadrar(r); };
    cont.appendChild(b);
  });

  // recorridos
  capaRutas.clearLayers();
  lista.forEach(r => {
    const sel = r.id === seleccionada;
    const apagada = seleccionada && !sel;
    const l = L.polyline(r.recorrido, { color: r.color, weight: sel ? 8 : 5, opacity: apagada ? 0.25 : 0.9 }).addTo(capaRutas);
    l.bindTooltip(r.nombre, { sticky: true });
    l.on("click", () => { seleccionada = r.id; pintar(); });
    if (sel) {
      const ini = r.recorrido[0], fin = r.recorrido[r.recorrido.length - 1];
      L.circleMarker(ini, { radius: 8, color: "#fff", weight: 3, fillColor: "#15803d", fillOpacity: 1 }).bindTooltip("Inicio").addTo(capaRutas);
      L.circleMarker(fin, { radius: 8, color: "#fff", weight: 3, fillColor: "#b91c1c", fillOpacity: 1 }).bindTooltip("Fin").addTo(capaRutas);
    }
  });

  // paradas
  capaParadas.clearLayers();
  const nombresSel = seleccionada ? (rutas.find(r => r.id === seleccionada)?.nombre || "").toLowerCase() : null;
  paradas.filter(p => {
    if (nombresSel) return p.rutas.some(n => n.toLowerCase() === nombresSel);
    if (lugar) return distPunto(lugar, [p.latitud, p.longitud]) <= radio;
    return true;
  }).forEach(p => {
    L.marker([p.latitud, p.longitud], { icon: icono("") }).addTo(capaParadas)
      .bindPopup(`<strong>${esc(p.nombre)}</strong><br>${esc(p.colonia)}<br>Rutas: ${p.rutas.map(esc).join(", ") || "Sin rutas"}`);
  });

  // lugar elegido
  capaLugar.clearLayers();
  if (lugar) {
    L.marker(lugar, { icon: icono("yo") }).addTo(capaLugar).bindTooltip("Tu lugar");
    L.circle(lugar, { radius: radio, color: "#7c3aed", weight: 1, fillOpacity: 0.07, interactive: false }).addTo(capaLugar);
  }
  $("titulo-mapa").textContent = seleccionada ? (rutas.find(r => r.id === seleccionada)?.nombre || "Mapa") : "Mapa";
  $("detalle-mapa").textContent = seleccionada
    ? "Verde = inicio, rojo = fin. Los pines morados son sus paradas."
    : "Toca una ruta de la lista o una línea del mapa para ver su recorrido.";
}

function encuadrar(r) {
  mapa.fitBounds(L.polyline(r.recorrido).getBounds(), { padding: [40, 40] });
  document.querySelector(".panel-mapa").scrollIntoView({ behavior: "smooth" });
}

// ---------- Interacciones ----------
$("buscar").addEventListener("input", () => { seleccionada = null; pintar(); });
$("radio").addEventListener("change", pintar);
mapa.on("click", e => { lugar = [e.latlng.lat, e.latlng.lng]; seleccionada = null; pintar(); });

$("btn-ubicacion").onclick = () => {
  if (!navigator.geolocation) return aviso("Tu navegador no permite obtener la ubicación. Toca un punto en el mapa.");
  $("btn-ubicacion").textContent = "Buscando…";
  navigator.geolocation.getCurrentPosition(
    pos => {
      $("btn-ubicacion").textContent = "Usar mi ubicación";
      lugar = [pos.coords.latitude, pos.coords.longitude]; seleccionada = null;
      mapa.setView(lugar, 15); pintar();
    },
    () => { $("btn-ubicacion").textContent = "Usar mi ubicación"; aviso("No pudimos obtener tu ubicación. Permite el acceso o toca un punto en el mapa."); },
    { enableHighAccuracy: true, timeout: 10000 }
  );
};
$("btn-limpiar").onclick = () => { lugar = null; seleccionada = null; $("buscar").value = ""; mapa.setView([19.0414, -98.2063], 13); pintar(); };

cargar();
