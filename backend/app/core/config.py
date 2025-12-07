from pydantic_settings import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    PROJECT_NAME: str = "Loan Processing Automation"
    API_V1_STR: str = "/api/v1"

    # MongoDB configuration
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB: str = os.getenv("MONGODB_DB", "loan_automation")

    GOOGLE_API_KEY: Optional[str] = os.getenv("GOOGLE_API_KEY")

    # AI Agent Orchestrator Configuration
    GEMINI_MODEL_VERSION: str = "gemini-2.5-flash-lite"
    AGENT_TIMEOUT_SECONDS: int = 30
    MAX_PARALLEL_AGENTS: int = 5
    ENABLE_AGENT_LOGGING: bool = True
    BACKEND_CORS_ORIGINS: str = os.getenv("BACKEND_CORS_ORIGINS", "*")

    class Config:
        case_sensitive = True
        env_file = ".env"

    def get_mongo_uri(self) -> str:
        return self.MONGODB_URI

    def get_cors_origins(self) -> list[str]:
        """
        Return a list of allowed CORS origins from configuration.
        Comma-separated values are supported via BACKEND_CORS_ORIGINS.
        Defaults to ["*"] to match permissive development behavior.
        """
        raw = self.BACKEND_CORS_ORIGINS
        if isinstance(raw, str):
            origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
        else:
            origins = list(raw) if raw else []
        return origins or ["*"]


settings = Settings()
