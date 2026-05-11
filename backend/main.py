# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.routers import auth, admin, issuer, verification

app = FastAPI(
    title=settings.APP_NAME,
    description="Cryptographic Academic Certificate Verification System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],   # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(issuer.router)
app.include_router(verification.router)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.APP_NAME}