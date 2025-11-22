from fastapi import APIRouter
from app.api.v1.endpoints import loans, documents

api_router = APIRouter()
api_router.include_router(loans.router, prefix="/loans", tags=["loans"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
