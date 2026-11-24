import json

from fastapi import APIRouter, Depends, HTTPException

from app.auth import solo_admin, usuario_actual
from app.database import redis_client
from app.models import Ruta

router = APIRouter(prefix="/rutas", tags=["Rutas"])


def _clave(ruta_id: str) -> str:
    return f"ruta:{ruta_id}"


@router.get("", dependencies=[Depends(usuario_actual)])
def listar_rutas():
    rutas = [json.loads(redis_client.get(c)) for c in redis_client.scan_iter(match="ruta:*") if redis_client.get(c)]
    rutas.sort(key=lambda r: r["nombre"].lower())
    return {"total": len(rutas), "rutas": rutas}


@router.get("/{ruta_id}", dependencies=[Depends(usuario_actual)])
def obtener_ruta(ruta_id: str):
    datos = redis_client.get(_clave(ruta_id))
    if not datos:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    return json.loads(datos)


@router.post("", status_code=201, dependencies=[Depends(solo_admin)])
def crear_ruta(ruta: Ruta):
    redis_client.set(_clave(ruta.id), ruta.model_dump_json())
    return {"mensaje": "Ruta creada", "id": ruta.id}


@router.put("/{ruta_id}", dependencies=[Depends(solo_admin)])
def actualizar_ruta(ruta_id: str, ruta: Ruta):
    actual = redis_client.get(_clave(ruta_id))
    if not actual:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    ruta.id = ruta_id
    ruta.creado_en = json.loads(actual).get("creado_en", ruta.creado_en)
    redis_client.set(_clave(ruta_id), ruta.model_dump_json())
    return {"mensaje": "Ruta actualizada", "id": ruta_id}


@router.delete("/{ruta_id}", dependencies=[Depends(solo_admin)])
def eliminar_ruta(ruta_id: str):
    if not redis_client.delete(_clave(ruta_id)):
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    return {"mensaje": "Ruta eliminada", "id": ruta_id}
