# app/api/v1/drones.py
from datetime import datetime
from http.client import HTTPException
from sqlalchemy import select
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from database.db import get_db
from app.api.v1.crud.drone import update_telemetry
from app.api.deps import get_current_drone, get_current_user
from core.websocket_manager import manager
from model.model import Drone, DroneTelemetry, ScanSession


router = APIRouter(prefix="/drone", tags=["drone"])


# === ДЛЯ ДРОНА (сам себя шлёт) ===
@router.post("/telemetry")
async def telemetry(
    data: dict,
    drone=Depends(get_current_drone),
    db: AsyncSession = Depends(get_db)
):
    drone_id = drone["drone_id"]
    await update_telemetry(db, drone_id, data)

    await manager.broadcast({
        "type": "telemetry",
        "drone_id": drone_id,
        "position": [
            data.get("position_x", 0.0),
            data.get("position_y", 0.0),
            data.get("position_z", 0.0)
        ],
        "velocity": [
            data.get("velocity_x", 0.0),
            data.get("velocity_y", 0.0),
            data.get("velocity_z", 0.0)
        ],
        "battery": data.get("battery_level"),
        "heading": data.get("heading"),
        "status": data.get("status", "flying"),
        "timestamp": data.get("timestamp")
    })
    return {"status": "ok"}


# === ДЛЯ ФРОНТА / ОПЕРАТОРОВ ===
@router.get("/list", response_model=List[dict])
async def get_all_drones(
    db: AsyncSession = Depends(get_db),
    
):
    """Список всех дронов + телеметрия + последняя сессия — без ленивых падений"""
    
    result = await db.execute(
        select(Drone)
        .options(
            selectinload(Drone.telemetry),        # ← сразу подгружаем телеметрию
            selectinload(Drone.scans)          # ← и все сессии (нужны для последней)
        )
        .order_by(Drone.id)
    )
    drones = result.scalars().all()

    output = []
    for d in drones:
        # Теперь d.telemetry — уже загружено, никаких запросов в БД!
        telemetry = None
        if d.telemetry:
            telemetry = {
                "position": [d.telemetry.position_x, d.telemetry.position_y, d.telemetry.position_z],
                "battery": d.telemetry.battery_level,
                "heading": d.telemetry.heading,
                "last_update": d.telemetry.last_update.isoformat() if d.telemetry.last_update else None
            }

        # Последняя сессия — берём из уже загруженных
        last_session = None
        if d.scans:
            # Сортируем по дате и берём последнюю
            d.scans.sort(key=lambda s: s.started_at or datetime.min, reverse=True)
            last_session = d.scans[0]

        output.append({
            "id": d.id,
            "name": d.name,
            "status": d.status,
            "owner_id": d.owner_id,
            "model": d.model,
            "telemetry": telemetry,
            "current_session": {
                "id": last_session.id if last_session else None,
                "status": last_session.status if last_session else None,
                "started_at": last_session.started_at.isoformat() if last_session and last_session.started_at else None,
                "total_scanned": last_session.total_items_scanned if last_session else 0
            } if last_session else None
        })

    return output


@router.get("/{drone_id}", response_model=dict)
async def get_drone_by_id(
    drone_id: int,
    db: AsyncSession = Depends(get_db),
    # current_user: dict = Depends(get_current_user)  # раскомментировать, если нужна авторизация
):
    """Получить один дрон по ID — для страницы /drone/1"""
    result = await db.execute(
        select(Drone)
        .options(
            selectinload(Drone.telemetry),
            selectinload(Drone.scans)
        )
        .where(Drone.id == drone_id)
    )
    drone = result.scalars().first()

    if not drone:
        raise HTTPException(status_code=404, detail="Дрон не найден")

    # Телеметрия
    telemetry = None
    if drone.telemetry:
        telemetry = {
            "position": [drone.telemetry.position_x, drone.telemetry.position_y, drone.telemetry.position_z],
            "battery": drone.telemetry.battery_level,
            "heading": drone.telemetry.heading,
            "last_update": drone.telemetry.last_update.isoformat() if drone.telemetry.last_update else None
        }

    # Последняя сессия
    last_session = None
    if drone.scans:
        drone.scans.sort(key=lambda s: s.started_at or datetime.min, reverse=True)
        last_session = drone.scans[0]

    return {
        "id": drone.id,
        "name": drone.name,
        "status": drone.status,
        "owner_id": drone.owner_id,
        "model": drone.model or "Не указано",
        "telemetry": telemetry,
        "current_session": {
            "id": last_session.id if last_session else None,
            "status": last_session.status if last_session else None,
            "started_at": last_session.started_at.isoformat() if last_session and last_session.started_at else None,
            "total_scanned": last_session.total_items_scanned if last_session else 0
        } if last_session else None
    }


@router.get("/{drone_id}/telemetry")
async def get_drone_telemetry(drone_id: int, db: AsyncSession = Depends(get_db), _: dict = Depends(get_current_user)):
    """Текущая телеметрия конкретного дрона"""
    result = await db.execute(
        select(DroneTelemetry).where(DroneTelemetry.drone_id == drone_id)
    )
    telemetry = result.scalar_one_or_none()

    if not telemetry:
        raise HTTPException(404, "Telemetry not found")

    return {
        "drone_id": drone_id,
        "position": [telemetry.position_x, telemetry.position_y, telemetry.position_z],
        "velocity": [telemetry.velocity_x, telemetry.velocity_y, telemetry.velocity_z],
        "battery_level": telemetry.battery_level,
        "battery_voltage": telemetry.battery_voltage,
        "heading": telemetry.heading,
        "last_update": telemetry.last_update.isoformat()
    }


@router.get("/{drone_id}/status")
async def get_drone_status(drone_id: int, db: AsyncSession = Depends(get_db), _: dict = Depends(get_current_user)):
    """Краткий статус дрона (для дашборда)"""
    drone = await db.get(Drone, drone_id)
    if not drone:
        raise HTTPException(404, "Drone not found")

    return {
        "drone_id": drone.id,
        "name": drone.name,
        "status": drone.status,
        "is_active": drone.is_active,
        "battery": drone.telemetry.battery_level if drone.telemetry else None,
        "last_seen": drone.telemetry.last_update.isoformat() if drone.telemetry and drone.telemetry.last_update else None
    }