from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import auth, scan, ws, drones
from app.api.v1 import inventory
from database.db import async_engine as engine
from model.model import Base

app = FastAPI(title="Warehouse Drone System")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://oop-teal.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(auth.router)
app.include_router(scan.router)
app.include_router(drones.router)
app.include_router(ws.router)
app.include_router(inventory.router)

@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
