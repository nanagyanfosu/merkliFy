from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str           # openssl rand -hex 32
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    PRIVATE_KEY_ENCRYPTION_KEY: str
    SETUP_KEY: str  

    # App
    APP_ENV: str = "development"
    APP_NAME: str = "merkliFy"

    class Config:
        env_file = ".env"


settings = Settings()