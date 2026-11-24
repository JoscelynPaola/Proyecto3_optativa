import base64
import hashlib
import hmac
import json
import os
import secrets
import time

from fastapi import APIRouter, Depends, Header, HTTPException

from app.database import redis_client
from app.models import Credenciales

router = APIRouter(prefix="/auth", tags=["Sesión"])

SECRET_KEY = os.getenv("SECRET_KEY") or secrets.token_hex(32)  # sin SECRET_KEY, las sesiones se cierran al reiniciar
DURACION = 60 * 60 * 8  # 8 horas
if not os.getenv("SECRET_KEY"):
    print("AVISO: no hay SECRET_KEY en .env; las sesiones se invalidan cada vez que el servidor se reinicia.")


def _hash(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 200_000).hex()


def _guardar_usuario(usuario: str, password: str, rol: str):
    salt = secrets.token_hex(16)
    redis_client.set(
        f"usuario:{usuario}",
        json.dumps({"usuario": usuario, "rol": rol, "salt": salt, "hash": _hash(password, salt)}),
    )


def crear_admin_inicial():
    """Crea (o actualiza) el administrador con ADMIN_USER y ADMIN_PASSWORD del .env."""
    usuario = (os.getenv("ADMIN_USER") or "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD") or ""
    if usuario and password:
        _guardar_usuario(usuario, password, "admin")
    else:
        print("AVISO: define ADMIN_USER y ADMIN_PASSWORD en .env para tener administrador.")


def _firmar(datos: dict) -> str:
    cuerpo = base64.urlsafe_b64encode(json.dumps(datos).encode()).decode()
    firma = hmac.new(SECRET_KEY.encode(), cuerpo.encode(), hashlib.sha256).hexdigest()
    return f"{cuerpo}.{firma}"


def _verificar(token: str) -> dict:
    try:
        cuerpo, firma = token.split(".")
        datos = json.loads(base64.urlsafe_b64decode(cuerpo))
    except Exception:
        print("AUTH: token con formato inválido")
        raise HTTPException(status_code=401, detail="Sesión inválida: token mal formado")
    esperada = hmac.new(SECRET_KEY.encode(), cuerpo.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(firma, esperada):
        print("AUTH: firma incorrecta (el SECRET_KEY cambió desde que iniciaste sesión)")
        raise HTTPException(status_code=401, detail="Sesión inválida: cierra sesión y vuelve a entrar")
    if datos.get("exp", 0) <= time.time():
        print("AUTH: token vencido")
        raise HTTPException(status_code=401, detail="Sesión vencida: vuelve a iniciar sesión")
    return datos


def usuario_actual(authorization: str = Header(default="")) -> dict:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Inicia sesión para continuar")
    return _verificar(authorization[7:])


def solo_admin(usuario: dict = Depends(usuario_actual)) -> dict:
    if usuario["rol"] != "admin":
        raise HTTPException(status_code=403, detail="Solo el administrador puede hacer esto")
    return usuario


def _respuesta(usuario: str, rol: str) -> dict:
    token = _firmar({"u": usuario, "rol": rol, "exp": time.time() + DURACION})
    return {"token": token, "usuario": usuario, "rol": rol}


@router.post("/login")
def login(c: Credenciales):
    usuario = c.usuario.strip().lower()
    datos = redis_client.get(f"usuario:{usuario}")
    if datos:
        d = json.loads(datos)
        if hmac.compare_digest(d["hash"], _hash(c.password, d["salt"])):
            return _respuesta(usuario, d["rol"])
    raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")


@router.post("/registro", status_code=201)
def registro(c: Credenciales):
    """Cualquier persona puede crear una cuenta, pero siempre con rol pasajero."""
    usuario = c.usuario.strip().lower()
    if redis_client.exists(f"usuario:{usuario}"):
        raise HTTPException(status_code=409, detail="Ese usuario ya existe")
    _guardar_usuario(usuario, c.password, "pasajero")
    return _respuesta(usuario, "pasajero")
