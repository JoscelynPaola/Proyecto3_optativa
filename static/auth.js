// Utilidades de sesión compartidas por todas las vistas
function sesion() {
  try { return JSON.parse(localStorage.getItem("rp_sesion")); } catch { return null; }
}
function guardarSesion(datos) { localStorage.setItem("rp_sesion", JSON.stringify(datos)); }
function salir() { localStorage.removeItem("rp_sesion"); location.href = "/"; }
function exigirRol(rol) {
  const s = sesion();
  if (!s || s.rol !== rol) { location.href = "/"; }
  return s;
}
// fetch que envía el token; si la sesión venció, regresa al login
async function api(url, opciones = {}) {
  const s = sesion();
  opciones.headers = { ...(opciones.headers || {}), ...(s ? { Authorization: "Bearer " + s.token } : {}) };
  const r = await fetch(url, opciones);
  if (r.status === 401) salir();
  return r;
}
