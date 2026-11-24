import os
import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")
if not REDIS_URL:
    raise RuntimeError("Falta la variable REDIS_URL en el archivo .env")

redis_client = redis.from_url(
    REDIS_URL,
    decode_responses=True,
    socket_connect_timeout=5,   # no esperar eternamente si no hay red
    socket_timeout=8,
    health_check_interval=30,   # revisa conexiones inactivas antes de usarlas
)


def probar_conexion() -> bool:
    try:
        return bool(redis_client.ping())
    except redis.RedisError:
        return False
