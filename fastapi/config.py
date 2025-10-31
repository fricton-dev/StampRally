from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    DB_HOST: str = "localhost"
    DB_PORT: int = 5432
    DB_NAME: str = "stamprally-db"
    DB_USER: str = "fricton"
    DB_PASSWORD: str = "fricton99"

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Application
    APP_NAME: str = "stamprally-app"
    DEBUG: bool = False
    CORS_ORIGINS: str = "http://localhost:8080"
    DEFAULT_TIMEZONE: Optional[str] = None

    # Tenant (optional)
    DEFAULT_TENANT_ID: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
