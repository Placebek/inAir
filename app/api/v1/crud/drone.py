# app/database/crud/drone.py
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from model.model import Drone, DroneTelemetry

async def get_drone_by_id(db: AsyncSession, drone_id: int):
    result = await db.execute(select(Drone).where(Drone.id == drone_id))
    return result.scalar_one_or_none()

async def update_telemetry(db: AsyncSession, drone_id: int, telemetry_data: dict):
    # Обновляем или создаём телеметрию
    result = await db.execute(select(DroneTelemetry).where(DroneTelemetry.drone_id == drone_id))
    telemetry = result.scalar_one_or_none()
    
    if not telemetry:
        telemetry = DroneTelemetry(drone_id=drone_id, **telemetry_data)
        db.add(telemetry)
    else:
        for key, value in telemetry_data.items():
            setattr(telemetry, key, value)
    
    await db.commit()