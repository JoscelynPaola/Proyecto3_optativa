import uuid
from datetime import datetime, timezone
from typing import List

from pydantic import BaseModel, Field


class Parada(BaseModel):
    id: str = Field(default_factory=lambda: f"pue-{uuid.uuid4().hex[:8]}")
    nombre: str
    colonia: str
    municipio: str = "Puebla"
    latitud: float = Field(ge=-90, le=90)
    longitud: float = Field(ge=-180, le=180)
    rutas: List[str] = Field(default_factory=list)
    activa: bool = True
    creado_en: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Ruta(BaseModel):
    id: str = Field(default_factory=lambda: f"rut-{uuid.uuid4().hex[:8]}")
    nombre: str = Field(min_length=1, max_length=60)
    color: str = Field(default="#7c3aed", pattern=r"^#[0-9a-fA-F]{6}$")
    # Recorrido: lista de puntos [latitud, longitud] en orden
    recorrido: List[List[float]] = Field(min_length=2)
    creado_en: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Credenciales(BaseModel):
    usuario: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=6, max_length=100)
