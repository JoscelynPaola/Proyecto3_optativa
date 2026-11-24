import json

from fastapi import APIRouter, Depends, HTTPException

from app.auth import solo_admin, usuario_actual

from app.database import redis_client
from app.models import Parada

router = APIRouter(prefix="/paradas", tags=["Paradas"])


def _clave(parada_id: str) -> str:
    return f"parada:{parada_id}"


@router.post("", status_code=201, dependencies=[Depends(solo_admin)])
def crear_parada(parada: Parada):
    clave = _clave(parada.id)

    if redis_client.exists(clave):
        raise HTTPException(status_code=409, detail="La parada ya existe")

    redis_client.set(clave, parada.model_dump_json())
    return {"mensaje": "Parada creada", "id": parada.id}


@router.get("", dependencies=[Depends(usuario_actual)])
def listar_paradas():
    paradas = []
    for clave in redis_client.scan_iter(match="parada:*"):
        datos = redis_client.get(clave)
        if datos:
            paradas.append(json.loads(datos))

    paradas.sort(key=lambda p: p.get("creado_en", ""))
    return {"total": len(paradas), "paradas": paradas}


@router.get("/{parada_id}", dependencies=[Depends(usuario_actual)])
def obtener_parada(parada_id: str):
    datos = redis_client.get(_clave(parada_id))

    if not datos:
        raise HTTPException(status_code=404, detail="Parada no encontrada")

    return json.loads(datos)


@router.put("/{parada_id}", dependencies=[Depends(solo_admin)])
def actualizar_parada(parada_id: str, parada: Parada):
    clave = _clave(parada_id)
    actual = redis_client.get(clave)

    if not actual:
        raise HTTPException(status_code=404, detail="Parada no encontrada")

    # Conserva el ID y la fecha de creación originales
    parada.id = parada_id
    parada.creado_en = json.loads(actual).get("creado_en", parada.creado_en)

    redis_client.set(clave, parada.model_dump_json())
    return {"mensaje": "Parada actualizada", "parada": parada}


@router.delete("/{parada_id}", dependencies=[Depends(solo_admin)])
def eliminar_parada(parada_id: str):
    clave = _clave(parada_id)

    if not redis_client.exists(clave):
        raise HTTPException(status_code=404, detail="Parada no encontrada")

    redis_client.delete(clave)
    return {"mensaje": "Parada eliminada", "id": parada_id}
