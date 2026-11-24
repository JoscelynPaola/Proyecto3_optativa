# 🚌 Rutas Puebla

API CRUD de paradas de transporte público en Puebla (FastAPI + Redis Cloud) con frontend en HTML/CSS/JS y mapa Leaflet.

## Requisitos
- Python 3.11+
- Una base de datos en Redis Cloud (endpoint, usuario y contraseña)

## Instalación
```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Configuración
Edita `.env` con tu cadena de conexión de Redis Cloud:
```
REDIS_URL=rediss://default:TU_PASSWORD@TU_HOST:PUERTO
```

## Ejecución
```bash
uvicorn app.main:app --reload
```
- App web: http://127.0.0.1:8000/
- Swagger: http://127.0.0.1:8000/docs
- Estado de Redis: http://127.0.0.1:8000/estado

## Endpoints
| Método | Ruta | Acción |
|--------|------|--------|
| POST | /paradas | Crear parada |
| GET | /paradas | Listar paradas |
| GET | /paradas/{id} | Obtener una parada |
| PUT | /paradas/{id} | Actualizar parada |
| DELETE | /paradas/{id} | Eliminar parada |

## Prueba rápida
```json
POST /paradas
{
  "nombre": "Parada BUAP",
  "colonia": "Los Volcanes",
  "latitud": 19.0467,
  "longitud": -98.2065,
  "rutas": ["Ruta 4", "Ruta 61"],
  "activa": true
}
```
