import os
import sys
from decouple import config

TESTING: bool = config("TESTING", cast=bool, default=("pytest" in sys.modules or "PYTEST_CURRENT_TEST" in os.environ))


def _to_async_url(url: str) -> str:
    """Normaliza a connection string do Postgres para o driver asyncpg.

    Provedores como Railway e Render entregam DATABASE_URL como
    `postgres://` ou `postgresql://` (driver síncrono padrão), mas o
    projeto usa SQLAlchemy assíncrono e precisa de `postgresql+asyncpg://`.
    """
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://"):]
    return url


MOCK_MODE: bool = config("MOCK_MODE", cast=bool, default=False)

if MOCK_MODE:
    DATABASE_URL: str = "sqlite+aiosqlite:///:memory:"
else:
    DATABASE_URL: str = _to_async_url(config("DATABASE_URL", default="sqlite+aiosqlite:///./aurorape.db"))

SECRET_KEY: str = config("SECRET_KEY", default="dev-secret-key-change-in-production")
ALGORITHM: str = config("ALGORITHM", default="HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = config("ACCESS_TOKEN_EXPIRE_MINUTES", cast=int, default=60)
DEBUG: bool = config("DEBUG", cast=bool, default=False)
SITE_NAME: str = config("SITE_NAME", default="Aurora PE")
SITE_URL: str = config("SITE_URL", default="http://localhost:8000")

if not DEBUG and not TESTING and (SECRET_KEY == "dev-secret-key-change-in-production" or len(SECRET_KEY) < 32):
    raise RuntimeError(
        "CONFIGURAÇÃO DE SEGURANÇA CRÍTICA: SECRET_KEY precisa ser definida no ambiente com pelo menos 32 caracteres seguros quando DEBUG=False."
    )

# Origens permitidas por CORS, separadas por vírgula (ex: "http://localhost:3000,https://aurorape.vercel.app")
CORS_ORIGINS: str = config("CORS_ORIGINS", default="http://localhost:3000")

# Bucket S3-compatible (ex: Railway) para upload de imagens de matérias.
# Enquanto BUCKET_ENDPOINT_URL não estiver configurado, o endpoint de upload
# responde com erro controlado — colar URL de imagem continua funcionando normalmente.
BUCKET_ENDPOINT_URL: str = config("BUCKET_ENDPOINT_URL", default="")
BUCKET_NAME: str = config("BUCKET_NAME", default="")
BUCKET_ACCESS_KEY_ID: str = config("BUCKET_ACCESS_KEY_ID", default="")
BUCKET_SECRET_ACCESS_KEY: str = config("BUCKET_SECRET_ACCESS_KEY", default="")
BUCKET_REGION: str = config("BUCKET_REGION", default="auto")
BUCKET_PUBLIC_URL_BASE: str = config("BUCKET_PUBLIC_URL_BASE", default="")
