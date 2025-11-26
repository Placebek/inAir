# app/api/v1/scan.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from database.db import get_db
from model.model import Product, InventoryItem, ScanSession
from app.api.deps import get_current_drone
from core.websocket_manager import manager
from datetime import datetime

router = APIRouter(prefix="/drone", tags=["drone"])

@router.post("/scan")
async def receive_scan(
    barcode: str,
    db: AsyncSession = Depends(get_db),
    drone = Depends(get_current_drone)
):
    drone_id = drone["drone_id"]
    
    # Ищем товар
    product = (await db.execute(select(Product).where(Product.barcode == barcode))).scalar_one_or_none()
    if not product:
        await manager.broadcast({"type": "unknown_barcode", "barcode": barcode, "drone_id": drone_id})
        return {"status": "unknown"}

    # Ищем или создаём сессию
    session = (await db.execute(
        select(ScanSession).where(
            ScanSession.drone_id == drone_id,
            ScanSession.status == "running"
        )
    )).scalar_one_or_none()
    
    if not session:
        session = ScanSession(drone_id=drone_id, started_at=datetime.utcnow())
        db.add(session)
        await db.commit()

    # Обновляем/создаём позицию товара
    item = (await db.execute(
        select(InventoryItem).where(
            InventoryItem.product_id == product.id,
            InventoryItem.location == "UNKNOWN"  # пока дрон не знает зону
        )
    )).scalar_one_or_none()

    if not item:
        item = InventoryItem(
            product_id=product.id,
            location="UNKNOWN",
            quantity=1,
            last_scanned=datetime.utcnow(),
            scan_session=session
        )
        db.add(item)
    else:
        item.quantity += 1
        item.last_scanned = datetime.utcnow()

    session.total_items_scanned += 1
    await db.commit()

    # Рассылка на фронт
    await manager.broadcast({
        "type": "new_scan",
        "drone_id": drone_id,
        "barcode": barcode,
        "product_name": product.name,
        "sku": product.sku,
        "timestamp": datetime.utcnow().isoformat()
    })

    return {"status": "scanned", "product": product.name}