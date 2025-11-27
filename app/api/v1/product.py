# app/api/v1/product.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select, func
from typing import List, Optional

from database.db import get_db
from model.model import Product, ProductCategory, Warehouse, InventoryItem
from pydantic import BaseModel, Field, ConfigDict
from enum import StrEnum

router = APIRouter(prefix="/products", tags=["products"])


# ========================================
# Enums & Pydantic схемы
# ========================================
class Weight3DType(StrEnum):
    small_box = "small_box"
    medium_box = "medium_box"
    large_box = "large_box"
    pallet = "pallet"
    unknown = "unknown"


class WarehouseRead(BaseModel):
    id: int
    name: Optional[str] = None
    number_warehouse: int
    address: str

    model_config = ConfigDict(from_attributes=True)


class CategoryRead(BaseModel):
    id: int
    category_name: str
    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    barcode: str = Field(..., max_length=100)
    sku: str = Field(..., max_length=50)
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    price: float = Field(0.0, ge=0)
    product_number: Optional[int] = Field(None, ge=0)
    weight_3d: Weight3DType = Weight3DType.unknown
    expected_location: Optional[str] = Field(None, max_length=100)
    category_id: Optional[int] = None
    warehouse_id: int = Field(..., description="ID склада, к которому привязан товар")


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    barcode: Optional[str] = None
    sku: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    product_number: Optional[int] = None
    weight_3d: Optional[Weight3DType] = None
    expected_location: Optional[str] = None
    category_id: Optional[int] = None
    warehouse_id: Optional[int] = None


class ProductRead(ProductBase):
    id: int
    total_quantity: int = 0
    warehouse: WarehouseRead
    category: Optional[CategoryRead] = None

    model_config = ConfigDict(from_attributes=True)


# ========================================
# Роуты
# ========================================

async def _enrich_product_read(product: Product, db: AsyncSession) -> ProductRead:
    # Базовые поля + id
    data = ProductRead.model_validate(product)

    # Подсчитываем количество на складе
    total = await db.scalar(
        select(func.coalesce(func.sum(InventoryItem.quantity), 0))
        .where(InventoryItem.product_id == product.id)
    )
    data.total_quantity = int(total or 0)

    # Подгружаем склад (он уже должен быть загружен через joinedload)
    data.warehouse = WarehouseRead.model_validate(product.warehouse)

    # Подгружаем категорию, если есть
    if product.category_rel:
        data.category = CategoryRead.model_validate(product.category_rel)

    return data

@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(product_in: ProductCreate, db: AsyncSession = Depends(get_db)):
    # Проверка дублей barcode/sku
    exists = await db.scalar(
        select(Product).where(
            (Product.barcode == product_in.barcode) |
            (Product.sku == product_in.sku)
        )
    )
    if exists:
        raise HTTPException(status_code=400, detail="Barcode или SKU уже используется")

    # Проверка склада
    warehouse = await db.get(Warehouse, product_in.warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=404, detail="Склад не найден")

    # Проверка категории (если указана)
    if product_in.category_id is not None:
        category = await db.get(ProductCategory, product_in.category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Категория не найдена")

    new_product = Product(**product_in.model_dump())
    db.add(new_product)
    await db.commit()
    await db.refresh(new_product)

    return ProductRead.model_validate(new_product)


@router.get("/", response_model=List[ProductRead])
async def get_products(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None),
    warehouse_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    in_stock: bool = Query(False),
):
    qty_subq = (
        select(
            InventoryItem.product_id,
            func.coalesce(func.sum(InventoryItem.quantity), 0).label("total_qty")
        )
        .group_by(InventoryItem.product_id)
        .subquery()
    )

    query = (
        select(Product, func.coalesce(qty_subq.c.total_qty, 0))
        .outerjoin(qty_subq, Product.id == qty_subq.c.product_id)
        .options(
            joinedload(Product.warehouse),
            joinedload(Product.category_rel)
        )
        .order_by(Product.product_number.nulls_last(), Product.name)
    )

    if search:
        pattern = f"%{search.lower()}%"
        query = query.where(
            func.lower(Product.name).like(pattern) |
            func.lower(Product.sku).like(pattern) |
            Product.barcode.like(f"%{search}%")
        )

    if warehouse_id is not None:
        query = query.where(Product.warehouse_id == warehouse_id)

    if category_id is not None:
        query = query.where(Product.category_id == category_id)

    if in_stock:
        query = query.having(func.coalesce(qty_subq.c.total_qty, 0) > 0)

    result = await db.execute(query.offset(skip).limit(limit))
    rows = result.all()

    products = []
    for product, qty in rows:
        item = ProductRead.model_validate(product)
        item.total_quantity = int(qty)

        # Категория подгружается автоматически через joinedload → попадает в ответ
        if product.category_rel:
            item.category = CategoryRead.model_validate(product.category_rel)

        products.append(item)

    return products


@router.get("/{product_id}", response_model=ProductRead)
async def get_product_by_id(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await db.get(
        Product, product_id,
        options=[joinedload(Product.warehouse), joinedload(Product.category_rel)]
    )
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")

    total_qty = await db.scalar(
        select(func.coalesce(func.sum(InventoryItem.quantity), 0))
        .where(InventoryItem.product_id == product_id)
    )

    item = ProductRead.model_validate(product)
    item.total_quantity = int(total_qty or 0)

    if product.category_rel:
        item.category = CategoryRead.model_validate(product.category_rel)

    return item


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(product_id: int, product_in: ProductUpdate, db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Товар не найден")

    update_data = product_in.model_dump(exclude_unset=True)

    # Проверка уникальности
    if "barcode" in update_data or "sku" in update_data:
        q = select(Product).where(Product.id != product_id)
        if "barcode" in update_data:
            q = q.where(Product.barcode == update_data["barcode"])
        if "sku" in update_data:
            q = q.where(Product.sku == update_data["sku"])
        if await db.scalar(q):
            raise HTTPException(400, "Barcode или SKU уже используется")

    # Проверка склад и категория
    if "warehouse_id" in update_data and not await db.get(Warehouse, update_data["warehouse_id"]):
        raise HTTPException(404, "Склад не найден")
    if "category_id" in update_data and update_data["category_id"] is not None:
        if not await db.get(ProductCategory, update_data["category_id"]):
            raise HTTPException(404, "Категория не найдена")

    for key, value in update_data.items():
        setattr(product, key, value)

    await db.commit()
    await db.refresh(product, ["warehouse", "category_rel"])

    return await _enrich_product_read(product, db)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")

    await db.delete(product)
    await db.commit()
    return None