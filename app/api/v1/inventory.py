# app/api/v1/inventory.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from database.db import get_db
from model.model import Product, InventoryItem, ScanSession
from app.api.deps import get_current_user  # если нужна авторизация

router = APIRouter(prefix="/inventory", tags=["inventory"])

@router.get("/", response_model=List[dict])
async def get_inventory(
    db: AsyncSession = Depends(get_db),
    location: Optional[str] = Query(None, description="Фильтр по месту (A-12, UNKNOWN и т.д.)"),
    search: Optional[str] = Query(None, description="Поиск по названию, SKU или штрихкоду"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    # current_user = Depends(get_current_user)  # ← раскомментируй при необходимости
):
    """
    Получить текущий склад (инвентарь)
    Поддерживает:
    - Фильтр по location
    - Поиск по названию/SKU/штрихкоду
    - Пагинация
    """
    # Базовый запрос: соединяем Product + InventoryItem
    query = select(
        Product.barcode,
        Product.name,
        Product.sku,
        Product.category,
        InventoryItem.location,
        InventoryItem.quantity,
        InventoryItem.last_scanned,
        func.coalesce(InventoryItem.scan_session_id, 0).label("session_id")
    ).join(
        InventoryItem, Product.id == InventoryItem.product_id
    ).order_by(InventoryItem.last_scanned.desc())

    # Фильтры
    if location:
        query = query.where(InventoryItem.location == location)
    if search:
        search_lower = f"%{search.lower()}%"
        query = query.where(
            func.lower(Product.name).like(search_lower) |
            func.lower(Product.sku).like(search_lower) |
            Product.barcode.like(search_lower)
        )

    # Пагинация
    query = query.limit(limit).offset(offset)

    result = await db.execute(query)
    rows = result.all()

    # Формируем красивый ответ
    inventory = []
    for row in rows:
        inventory.append({
            "barcode": row.barcode,
            "name": row.name,
            "sku": row.sku,
            "category": row.category or "Без категории",
            "location": row.location,
            "quantity": row.quantity,
            "last_scanned": row.last_scanned.isoformat() if row.last_scanned else None,
            "session_id": row.session_id
        })

    return inventory


@router.get("/stats")
async def get_inventory_stats(db: AsyncSession = Depends(get_db)):
    """Статистика по складу — для дашборда"""
    total_items = await db.scalar(select(func.count()).select_from(InventoryItem))
    total_products = await db.scalar(select(func.count()).select_from(Product))
    unknown_location = await db.scalar(
        select(func.count()).select_from(InventoryItem).where(InventoryItem.location == "UNKNOWN")
    )

    today_scans = await db.scalar(
        select(func.count()).select_from(InventoryItem)
        .where(func.date(InventoryItem.last_scanned) == func.date('now'))
    )

    return {
        "total_items": total_items or 0,
        "unique_products": total_products or 0,
        "unknown_location_count": unknown_location or 0,
        "scanned_today": today_scans or 0
    }