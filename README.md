# Rutas Puebla

App web para consultar y administrar el transporte público de Puebla. API en **FastAPI** con datos en **Redis Cloud**, y un frontend en HTML, CSS y JavaScript con mapa **Leaflet** (OpenStreetMap).

## ¿Qué hace?

La app tiene dos tipos de usuario, cada uno con su propia vista.

**Administrador** (`/admin`)
- Registra, edita y elimina **paradas**.
- Registra, edita y elimina **rutas**, dibujando su recorrido punto por punto sobre el mapa.

**Pasajero** (`/pasajero`)
- Crea su cuenta desde la pantalla de inicio.
- Busca rutas por nombre.
- Ve las rutas que pasan cerca de él (con su ubicación o tocando un punto del mapa) y a qué distancia.
- Ve el recorrido dibujado de cada ruta, con su inicio, su final y sus paradas.
- Solo puede consultar; no puede crear, editar ni borrar.

Los permisos se validan en el servidor: un pasajero que intente modificar datos recibe un error 403.

## Requisitos

- Python 3.11 o superior
- Una base de datos en [Redis Cloud](https://redis.io/cloud/) (endpoint, usuario y contraseña)

## Instalación

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Configuración

Crea un archivo `.env` en la raíz del proyecto (junto a `app/` y `static/`):

```env
REDIS_URL=redis://default:TU_PASSWORD@TU_HOST:PUERTO
ADMIN_USER=admin
ADMIN_PASSWORD=una_clave_segura
SECRET_KEY=un_texto_largo_y_aleatorio
```

| Variable | Para qué sirve |
|---|---|
| `REDIS_URL` | Cadena de conexión a Redis Cloud. Usa `redis://` si tu base no tiene TLS y `rediss://` si lo tiene activado. |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Usuario y contraseña del administrador. Se crea (o actualiza) al iniciar el servidor. |
| `SECRET_KEY` | Clave para firmar las sesiones. Debe ser fija: si falta, las sesiones se invalidan cada vez que el servidor se reinicia. |

> **Importante:** el `.env` contiene contraseñas. No lo subas a GitHub (ya está en `.gitignore`).

## Ejecución

```bash
uvicorn app.main:app --reload
```

| Dirección | Qué es |
|---|---|
| http://127.0.0.1:8000/ | Inicio de sesión y registro |
| http://127.0.0.1:8000/admin | Panel del administrador |
| http://127.0.0.1:8000/pasajero | Vista del pasajero |
| http://127.0.0.1:8000/docs | Documentación de la API (Swagger) |
| http://127.0.0.1:8000/estado | Comprueba la conexión con Redis |

## Cómo usarla

1. Abre `http://127.0.0.1:8000/estado` y verifica que diga `"redis_conectado": true`.
2. Entra a `http://127.0.0.1:8000/` con el usuario y la contraseña de `ADMIN_USER` y `ADMIN_PASSWORD`.
3. Registra paradas y rutas. Para dibujar una ruta, pulsa **Dibujar recorrido** y toca el mapa punto por punto.
4. Cierra sesión y crea una cuenta de pasajero para ver la otra vista.

> En el campo **Rutas** de cada parada escribe el nombre exacto de la ruta (por ejemplo, `Ruta 15`). Así el pasajero ve esa parada al elegir esa ruta.

## Endpoints

Todos requieren sesión iniciada, salvo los de `/auth`.

### Sesión

| Método | Ruta | Acción | Quién |
|---|---|---|---|
| POST | `/auth/login` | Iniciar sesión | Todos |
| POST | `/auth/registro` | Crear cuenta (siempre de pasajero) | Todos |

### Paradas

| Método | Ruta | Acción | Quién |
|---|---|---|---|
| POST | `/paradas` | Crear parada | Administrador |
| GET | `/paradas` | Listar paradas | Cualquier usuario |
| GET | `/paradas/{id}` | Obtener una parada | Cualquier usuario |
| PUT | `/paradas/{id}` | Actualizar parada | Administrador |
| DELETE | `/paradas/{id}` | Eliminar parada | Administrador |

### Rutas

| Método | Ruta | Acción | Quién |
|---|---|---|---|
| POST | `/rutas` | Crear ruta con su recorrido | Administrador |
| GET | `/rutas` | Listar rutas | Cualquier usuario |
| GET | `/rutas/{id}` | Obtener una ruta | Cualquier usuario |
| PUT | `/rutas/{id}` | Actualizar ruta | Administrador |
| DELETE | `/rutas/{id}` | Eliminar ruta | Administrador |

### Códigos de error

| Código | Significado |
|---|---|
| 401 | No hay sesión o ya venció. Vuelve a iniciar sesión. |
| 403 | Tu cuenta no tiene permiso para esta acción. |
| 404 | La parada o ruta no existe. |
| 409 | La parada o el usuario ya existe. |
| 503 | No hay conexión con Redis. Revisa tu internet. |

## Modelo de datos

Cada registro se guarda en Redis como JSON con una clave única.

**Parada** (`parada:{id}`)
```json
{
  "id": "pue-1a2b3c4d",
  "nombre": "Parada BUAP",
  "colonia": "Los Volcanes",
  "municipio": "Puebla",
  "latitud": 19.0467,
  "longitud": -98.2065,
  "rutas": ["Ruta 4", "Ruta 61"],
  "activa": true,
  "creado_en": "2026-11-08T23:00:00Z"
}
```

**Ruta** (`ruta:{id}`)
```json
{
  "id": "rut-5e6f7a8b",
  "nombre": "Ruta 15",
  "color": "#7c3aed",
  "recorrido": [[19.0431, -98.1937], [19.0467, -98.2065]],
  "creado_en": "2026-11-08T23:00:00Z"
}
```

**Usuario** (`usuario:{nombre}`): guarda el rol (`admin` o `pasajero`) y la contraseña cifrada con PBKDF2. Nunca se guarda en texto plano.

## Estructura del proyecto

```
rutas-puebla/
├── app/
│   ├── main.py        # Servidor, rutas de las vistas y manejo de errores
│   ├── database.py    # Conexión a Redis
│   ├── models.py      # Modelos: Parada, Ruta, Credenciales
│   ├── auth.py        # Login, registro, sesiones y permisos
│   ├── routes.py      # CRUD de paradas
│   └── rutas.py       # CRUD de rutas
├── static/
│   ├── login.html     # Inicio de sesión / registro
│   ├── admin.html     # Panel del administrador
│   ├── pasajero.html  # Vista del pasajero
│   ├── auth.js        # Sesión compartida
│   ├── app.js         # Paradas y mapa (administrador)
│   ├── admin-rutas.js # Rutas y dibujo del recorrido (administrador)
│   ├── pasajero.js    # Búsqueda y rutas cercanas (pasajero)
│   └── styles.css
├── .env
├── requirements.txt
└── README.md
```

## Solución de problemas

- **`getaddrinfo failed` o timeout:** tu equipo no alcanza a Redis. Revisa tu internet, apaga la VPN y confirma que el host del `.env` esté bien escrito. Si persiste, prueba con `rediss://`.
- **Error 401 al guardar:** la sesión venció o no se envió. Cierra sesión, vuelve a entrar y recarga con `Ctrl + Shift + R`. Revisa que `SECRET_KEY` exista en el `.env`.
- **El navegador muestra la versión vieja:** recarga con `Ctrl + Shift + R`.
- **Dos servidores a la vez:** cierra todas las terminales de `uvicorn` antes de arrancar uno nuevo.

## Siguientes pasos

- Búsqueda de paradas por colonia.
- Cálculo de la mejor ruta entre dos puntos.
- Mostrar en el mapa la unidad en tiempo real.
