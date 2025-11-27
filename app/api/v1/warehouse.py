from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import List, Optional
from database.db import get_db
from model.model import Warehouse
from app.api.deps import get_current_user  
from pydantic import BaseModel, Field
from typing import Optional


class WarehouseBase(BaseModel):
    address: str = Field(..., example="г. Караганда, ул. Сейфулина, д. 25")
    number_warehouse: int = Field(..., gt=0, example=1, description="Уникальный номер склада")
    name: Optional[str] = Field(None, max_length=100, example="Центральный склад Караганда")


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(WarehouseBase):
    address: Optional[str] = None
    name: Optional[str] = None
    number_warehouse: Optional[int] = None


class WarehouseRead(WarehouseBase):
    id: int

    model_config = {"from_attributes": True}


router = APIRouter(prefix="/warehouses", tags=["warehouses"])


@router.post(
    "/",
    response_model=WarehouseRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать новый склад",
    description="Только для администраторов"
)
async def create_warehouse(
    warehouse_in: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
):
    exists = await db.scalar(
        select(Warehouse).where(Warehouse.number_warehouse == warehouse_in.number_warehouse)
    )
    if exists:
        raise HTTPException(
            status_code=400,
            detail=f"Склад с номером {warehouse_in.number_warehouse} уже существует"
        )

    new_warehouse = Warehouse(**warehouse_in.model_dump())
    db.add(new_warehouse)
    await db.commit()
    await db.refresh(new_warehouse)
    return new_warehouse


@router.get("/", response_model=List[WarehouseRead])
async def get_warehouses(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None, description="Поиск по названию или адресу"),
):
    """Получить список складов с фильтрацией и пагинацией"""
    query = select(Warehouse).order_by(Warehouse.id)

    if search:
        search_pattern = f"%{search.lower()}%"
        query = query.where(
            and_(
                func.lower(Warehouse.name).like(search_pattern) |
                func.lower(Warehouse.address).like(search_pattern)
            )
        )

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    warehouses = result.scalars().all()
    return warehouses


@router.get("/{warehouse_id}", response_model=WarehouseRead)
async def get_warehouse_by_id(
    warehouse_id: int,
    db: AsyncSession = Depends(get_db)
):
    warehouse = await db.get(Warehouse, warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=404, detail="Склад не найден")
    return warehouse


@router.patch("/{warehouse_id}", response_model=WarehouseRead)
async def update_warehouse(
    warehouse_id: int,
    warehouse_in: WarehouseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    warehouse = await db.get(Warehouse, warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=404, detail="Склад не найден")

    update_data = warehouse_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(warehouse, key, value)

    await db.commit()
    await db.refresh(warehouse)
    return warehouse


@router.delete("/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_warehouse(
    warehouse_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    warehouse = await db.get(Warehouse, warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=404, detail="Склад не найден")

    await db.delete(warehouse)
    await db.commit()
    return None