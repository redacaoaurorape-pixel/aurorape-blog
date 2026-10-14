from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import CORS_ORIGINS, DEBUG, MOCK_MODE, UPLOAD_DIR
from app.database import engine
from app.mock_seed import seed_mock_data
from app.models import *  # noqa: F401,F403 — garante registro dos modelos
from app.routers.api.admin import router as admin_api_router
from app.routers.api.public import router as public_api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    if MOCK_MODE:
        await seed_mock_data()
    yield
    await engine.dispose()


app = FastAPI(
    title="Aurora PE API",
    description="API headless do portal de jornalismo independente de Pernambuco",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if DEBUG else None,
    redoc_url="/redoc" if DEBUG else None,
)

# Compressão de payload para respostas > 1KB (reduz tráfego de rede em 60-80%)
app.add_middleware(GZipMiddleware, minimum_size=1000)

origins = [origin.strip() for origin in CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    # Permite domínios de deploy e preview na Railway e Vercel
    allow_origin_regex=r"^https://(aurorape(-[a-zA-Z0-9_-]+)?\.vercel\.app|aurorape-.*\.up\.railway\.app)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if not DEBUG:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

app.include_router(public_api_router)
app.include_router(admin_api_router)

# Servir uploads locais quando BUCKET_ENDPOINT_URL não estiver configurado
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


@app.exception_handler(404)
async def not_found(request: Request, exc):
    return JSONResponse(status_code=404, content={"detail": "Não encontrado"})


@app.get("/health")
async def health_check():
    return {"status": "ok"}
