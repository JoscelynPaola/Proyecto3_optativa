const _sesion = exigirRol("admin");
document.getElementById("quien").textContent = "Administrador: " + _sesion.usuario;

// ============================================
// Mapa con Leaflet
// ============================================
const mapa = L.map("mapa").setView([19.0414, -98.2063], 13);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(mapa);

L.Marker.prototype.options.icon = L.divIcon({
  className: "",
  html: '<span class="pin"></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
  popupAnchor: [0, -26],
  tooltipAnchor: [14, -13]
});

let marcadorSeleccionado = null;
const capaParadas = L.layerGroup().addTo(mapa);

// ============================================
// Elementos y utilidades
// ============================================
const API = "/paradas";
const form = document.getElementById("form-parada");
const lista = document.getElementById("lista-paradas");
const mensaje = document.getElementById("mensaje");
const btnCancelar = document.getElementById("btn-cancelar");
const btnGuardar = document.getElementById("btn-guardar");
const titulo = document.getElementById("titulo-formulario");
const contador = document.getElementById("contador");

function esc(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

let temporizadorMensaje;
function mostrarMensaje(texto, tipo) {
  mensaje.textContent = texto;
  mensaje.className = tipo;
  clearTimeout(temporizadorMensaje);
  temporizadorMensaje = setTimeout(() => {
    mensaje.textContent = "";
    mensaje.className = "";
  }, 4000);
}

function limpiarFormulario() {
  form.reset();
  document.getElementById("parada-id").value = "";
  btnCancelar.classList.add("oculto");
  btnGuardar.textContent = "Guardar parada";
  titulo.textContent = "Registrar parada";
}

function popupHTML(parada) {
  const rutas = parada.rutas.length > 0 ? parada.rutas.map(esc).join(", ") : "Sin rutas";
  return `
    <strong>${esc(parada.nombre)}</strong><br>
    ${esc(parada.colonia)}<br>
    Rutas: ${rutas}
  `;
}

// ============================================
// Listar paradas + marcadores
// ============================================
async function cargarParadas() {
  try {
    const respuesta = await api(API);
    if (!respuesta.ok) throw new Error("No se pudo obtener la lista de paradas");

    const datos = await respuesta.json();

    lista.innerHTML = "";
    capaParadas.clearLayers();

    if (!datos.paradas || datos.paradas.length === 0) {
      contador.textContent = "0";
      lista.innerHTML = `<div class="vacio"><strong>Aún no hay paradas</strong>Llena el formulario y pulsa «Guardar parada» para agregar la primera.</div>`;
      return;
    }

    contador.textContent = datos.paradas.length;
    datos.paradas.forEach(parada => {
      const tarjeta = document.createElement("article");
      tarjeta.className = "parada";

      const chips = parada.rutas.length > 0
        ? `<div class="rutas">${parada.rutas.map(r => `<span class="ruta">${esc(r)}</span>`).join("")}</div>`
        : `<span class="sin-rutas">Sin rutas registradas</span>`;

      tarjeta.innerHTML = `
        <div class="parada-cabecera">
          <h3>${esc(parada.nombre)}</h3>
          <span class="estado ${parada.activa ? "activa" : "inactiva"}">${parada.activa ? "Activa" : "Inactiva"}</span>
        </div>
        <p>📍 ${esc(parada.colonia)}, ${esc(parada.municipio)}</p>
        ${chips}
        <p>${parada.latitud}, ${parada.longitud}</p>
        <div class="acciones">
          <button class="btn-ubicar" data-id="${esc(parada.id)}">Ver en mapa</button>
          <button class="btn-editar" data-id="${esc(parada.id)}">Editar</button>
          <button class="btn-eliminar" data-id="${esc(parada.id)}">Eliminar</button>
        </div>
      `;
      lista.appendChild(tarjeta);

      const marcador = L.marker([parada.latitud, parada.longitud]).addTo(capaParadas);
      marcador.bindPopup(popupHTML(parada));
      marcador.bindTooltip(parada.nombre);
    });
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
}

// ============================================
// Crear / actualizar
// ============================================
form.addEventListener("submit", async evento => {
  evento.preventDefault();

  const id = document.getElementById("parada-id").value;
  const rutas = document.getElementById("rutas").value
    .split(",")
    .map(ruta => ruta.trim())
    .filter(ruta => ruta !== "");

  const datos = {
    nombre: document.getElementById("nombre").value,
    colonia: document.getElementById("colonia").value,
    municipio: "Puebla",
    latitud: parseFloat(document.getElementById("latitud").value),
    longitud: parseFloat(document.getElementById("longitud").value),
    rutas,
    activa: document.getElementById("activa").value === "true"
  };

  const url = id ? `${API}/${id}` : API;
  const metodo = id ? "PUT" : "POST";

  try {
    const respuesta = await api(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos)
    });

    if (!respuesta.ok) {
      const error = await respuesta.json();
      const detalle = Array.isArray(error.detail)
        ? error.detail.map(e => e.msg).join(", ")
        : error.detail;
      throw new Error(detalle || "Error al guardar");
    }

    mostrarMensaje(
      id ? "Parada actualizada correctamente." : "Parada registrada correctamente.",
      "exito"
    );

    limpiarFormulario();
    cargarParadas();
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
});

// ============================================
// Editar / eliminar / ubicar
// ============================================
async function cargarParadaParaEditar(id) {
  try {
    const respuesta = await api(`${API}/${id}`);
    if (!respuesta.ok) throw new Error("No se encontró la parada");

    const parada = await respuesta.json();

    document.getElementById("parada-id").value = parada.id;
    document.getElementById("nombre").value = parada.nombre;
    document.getElementById("colonia").value = parada.colonia;
    document.getElementById("latitud").value = parada.latitud;
    document.getElementById("longitud").value = parada.longitud;
    document.getElementById("rutas").value = parada.rutas.join(", ");
    document.getElementById("activa").value = parada.activa.toString();

    btnCancelar.classList.remove("oculto");
    btnGuardar.textContent = "Guardar cambios";
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    titulo.textContent = "Editar parada";
    form.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
}

async function eliminarParada(id) {
  if (!confirm("¿Deseas eliminar esta parada?")) return;

  try {
    const respuesta = await api(`${API}/${id}`, { method: "DELETE" });
    if (!respuesta.ok) throw new Error("No se pudo eliminar la parada.");

    mostrarMensaje("Parada eliminada correctamente.", "exito");
    cargarParadas();
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
}

async function ubicarParadaEnMapa(id) {
  try {
    const respuesta = await api(`${API}/${id}`);
    if (!respuesta.ok) throw new Error("No se encontró la parada");

    const parada = await respuesta.json();

    if (marcadorSeleccionado) mapa.removeLayer(marcadorSeleccionado);

    marcadorSeleccionado = L.marker([parada.latitud, parada.longitud]).addTo(mapa);
    marcadorSeleccionado.bindPopup(popupHTML(parada)).openPopup();

    mapa.setView([parada.latitud, parada.longitud], 16);
    document.querySelector(".panel-mapa").scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    mostrarMensaje(error.message, "error");
  }
}

lista.addEventListener("click", evento => {
  const boton = evento.target.closest("button");
  if (!boton) return;

  const id = boton.dataset.id;
  if (!id) return;

  if (boton.classList.contains("btn-editar")) cargarParadaParaEditar(id);
  if (boton.classList.contains("btn-eliminar")) eliminarParada(id);
  if (boton.classList.contains("btn-ubicar")) ubicarParadaEnMapa(id);
});

btnCancelar.addEventListener("click", limpiarFormulario);
document.getElementById("btn-recargar").addEventListener("click", cargarParadas);

cargarParadas();
