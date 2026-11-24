// Administración de rutas: formulario + dibujo del recorrido sobre el mapa (usa `mapa` de app.js)
const RUTAS_API = "/rutas";
const rForm = document.getElementById("form-ruta");
const rLista = document.getElementById("lista-rutas");
const rBtnDibujar = document.getElementById("btn-dibujar");
const rInfo = document.getElementById("info-trazo");

let rDibujando = false;
let rPuntos = [];
const rCapa = L.layerGroup().addTo(mapa);
const rTrazo = L.polyline([], { color: "#7c3aed", weight: 5, dashArray: "8 8" }).addTo(mapa);
const rVertices = L.layerGroup().addTo(mapa);

function rPintarTrazo() {
  rTrazo.setLatLngs(rPuntos);
  rTrazo.setStyle({ color: document.getElementById("ruta-color").value });
  rVertices.clearLayers();
  rPuntos.forEach((p, i) => L.circleMarker(p, { radius: i === 0 ? 7 : 5, color: "#fff", weight: 2, fillColor: "#3b1578", fillOpacity: 1, interactive: false }).addTo(rVertices));
  rInfo.textContent = `Puntos marcados: ${rPuntos.length} (mínimo 2)`;
}

function rModoDibujo(activo) {
  rDibujando = activo;
  rBtnDibujar.textContent = activo ? "Terminar de dibujar" : "Dibujar recorrido";
  mapa.getContainer().style.cursor = activo ? "crosshair" : "";
  if (activo) document.querySelector(".panel-mapa").scrollIntoView({ behavior: "smooth" });
}

mapa.on("click", e => {
  if (!rDibujando) return;
  rPuntos.push([+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]);
  rPintarTrazo();
});
rBtnDibujar.onclick = () => rModoDibujo(!rDibujando);
document.getElementById("btn-deshacer").onclick = () => { rPuntos.pop(); rPintarTrazo(); };
document.getElementById("btn-borrar-trazo").onclick = () => { rPuntos = []; rPintarTrazo(); };
document.getElementById("ruta-color").oninput = rPintarTrazo;

function rLimpiar() {
  rForm.reset();
  document.getElementById("ruta-id").value = "";
  document.getElementById("titulo-ruta").textContent = "Registrar ruta";
  document.getElementById("btn-guardar-ruta").textContent = "Guardar ruta";
  document.getElementById("btn-cancelar-ruta").classList.add("oculto");
  rPuntos = [];
  rModoDibujo(false);
  rPintarTrazo();
}
document.getElementById("btn-cancelar-ruta").onclick = rLimpiar;

async function cargarRutas() {
  try {
    const r = await api(RUTAS_API);
    const datos = await r.json();
    rCapa.clearLayers();
    document.getElementById("contador-rutas").textContent = datos.rutas.length;
    rLista.innerHTML = datos.rutas.length ? "" : `<div class="vacio"><strong>Aún no hay rutas</strong>Dibuja el recorrido en el mapa y guarda la primera.</div>`;
    datos.rutas.forEach(ruta => {
      L.polyline(ruta.recorrido, { color: ruta.color, weight: 5, opacity: 0.85 }).addTo(rCapa).bindTooltip(ruta.nombre, { sticky: true });
      const t = document.createElement("article");
      t.className = "parada";
      t.innerHTML = `
        <div class="parada-cabecera"><h3><span class="punto-color" style="background:${esc(ruta.color)}"></span>${esc(ruta.nombre)}</h3></div>
        <p>${ruta.recorrido.length} puntos en el recorrido</p>
        <div class="acciones">
          <button class="btn-ubicar" data-id="${esc(ruta.id)}">Ver recorrido</button>
          <button class="btn-editar" data-id="${esc(ruta.id)}">Editar</button>
          <button class="btn-eliminar" data-id="${esc(ruta.id)}">Eliminar</button>
        </div>`;
      t._ruta = ruta;
      rLista.appendChild(t);
    });
  } catch { mostrarMensaje("No se pudieron cargar las rutas.", "error"); }
}

rLista.addEventListener("click", async e => {
  const b = e.target.closest("button");
  const tarjeta = e.target.closest(".parada");
  if (!b || !tarjeta) return;
  const ruta = tarjeta._ruta;
  if (b.classList.contains("btn-ubicar")) {
    mapa.fitBounds(L.polyline(ruta.recorrido).getBounds(), { padding: [30, 30] });
    document.querySelector(".panel-mapa").scrollIntoView({ behavior: "smooth" });
  }
  if (b.classList.contains("btn-editar")) {
    document.getElementById("ruta-id").value = ruta.id;
    document.getElementById("ruta-nombre").value = ruta.nombre;
    document.getElementById("ruta-color").value = ruta.color;
    rPuntos = ruta.recorrido.map(p => [...p]);
    rPintarTrazo();
    document.getElementById("titulo-ruta").textContent = "Editar ruta";
    document.getElementById("btn-guardar-ruta").textContent = "Guardar cambios";
    document.getElementById("btn-cancelar-ruta").classList.remove("oculto");
    rForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  if (b.classList.contains("btn-eliminar")) {
    if (!confirm(`¿Eliminar la ${ruta.nombre}?`)) return;
    const r = await api(`${RUTAS_API}/${ruta.id}`, { method: "DELETE" });
    mostrarMensaje(r.ok ? "Ruta eliminada correctamente." : "No se pudo eliminar la ruta.", r.ok ? "exito" : "error");
    if (r.ok) cargarRutas();
  }
});

rForm.addEventListener("submit", async e => {
  e.preventDefault();
  if (rPuntos.length < 2) return mostrarMensaje("Dibuja el recorrido: marca al menos 2 puntos en el mapa.", "error");
  const id = document.getElementById("ruta-id").value;
  try {
    const r = await api(id ? `${RUTAS_API}/${id}` : RUTAS_API, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: document.getElementById("ruta-nombre").value, color: document.getElementById("ruta-color").value, recorrido: rPuntos })
    });
    if (!r.ok) throw new Error("No se pudo guardar la ruta");
    mostrarMensaje(id ? "Ruta actualizada correctamente." : "Ruta registrada correctamente.", "exito");
    rLimpiar();
    cargarRutas();
  } catch (err) { mostrarMensaje(err.message, "error"); }
});

cargarRutas();
