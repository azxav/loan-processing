from fastapi import APIRouter
from backend.app.api.v1.endpoints import loans, documents, agent_chat, analytics

api_router = APIRouter()
api_router.include_router(loans.router, prefix="/loans", tags=["loans"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(agent_chat.router)
api_router.include_router(analytics.router)
