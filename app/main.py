import redis
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app import auth, rutas
from app.database import probar_conexion
from app.routes import router

app = FastAPI(
    title="Rutas Puebla",
    description="CRUD de paradas de transporte público en Puebla con Redis Cloud",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(router)
app.include_router(rutas.router)
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.exception_handler(redis.RedisError)
async def error_redis(request: Request, exc: redis.RedisError):
    return JSONResponse(
        status_code=503,
        content={"detail": "No hay conexión con la base de datos (Redis). Revisa tu internet y vuelve a intentar."},
    )


@app.on_event("startup")
def al_iniciar():
    try:
        auth.crear_admin_inicial()
    except Exception as e:
        print("No se pudo crear el administrador:", e)


@app.get("/", include_in_schema=False)
def inicio():
    return FileResponse("static/login.html")


@app.get("/admin", include_in_schema=False)
def vista_admin():
    return FileResponse("static/admin.html")


@app.get("/pasajero", include_in_schema=False)
def vista_pasajero():
    return FileResponse("static/pasajero.html")


@app.get("/estado")
def estado():
    return {"proyecto": "Rutas Puebla", "redis_conectado": probar_conexion()}
