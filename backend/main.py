import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.routers import auth, admin, issuer, verification, setup, registration
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded




app = FastAPI(
    title=settings.APP_NAME,
    description="Cryptographic Academic Certificate Verification System",
    version="1.0.0",
)

# In production, ALLOWED_ORIGINS is set in environment variables
# In development, it defaults to localhost
allowed_origins_raw = os.getenv(
    "ALLOWED_ORIGINS",
    "https://merklify.vercel.app, http://localhost:5173"
)
allowed_origins = [o.strip() for o in allowed_origins_raw.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,     
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(issuer.router)
app.include_router(verification.router)
app.include_router(setup.router)
app.include_router(registration.router)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}