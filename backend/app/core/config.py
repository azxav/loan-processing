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
    
    class Config:
        case_sensitive = True
        env_file = ".env"

    def get_mongo_uri(self) -> str:
        return self.MONGODB_URI


settings = Settings()
