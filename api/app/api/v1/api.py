"""
API v1 Router - Aggregates all endpoint routers
"""
from fastapi import APIRouter

from app.api.v1 import indices, requirements, assignments, users, evidence, index_users

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(indices.router)
api_router.include_router(requirements.router)
api_router.include_router(assignments.router)
api_router.include_router(users.router)
api_router.include_router(evidence.router)
api_router.include_router(index_users.router)
