# app/api/v1/product.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select, func
from typing import List, Optional

from database.db import get_db
from model.model import Product, ProductCategory, InventoryItem  # или model.model
from pydantic import BaseModel, Field, ConfigDict
from enum import StrEnum

router = APIRouter(prefix="/products", tags=["products"])


class Weight3DType(StrEnum):
    small_box = "small_box"
    medium_box = "medium_box"
    large_box = "large_box"
    pallet = "pallet"
    unknown = "unknown"


class CategoryRead(BaseModel):
    id: int
    category_name: str
    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    barcode: str = Field(..., max_length=100)
    name: str = Field(..., max_length=200)
    sku: str = Field(..., max_length=50)
    description: Optional[str] = None
    price: float = Field(0.0, ge=0)
    product_number: Optional[int] = Field(None, ge=0)
    weight_3d: Weight3DType = Weight3DType.unknown
    expected_location: Optional[str] = Field(None, max_length=100)
    category_id: Optional[int] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    barcode: Optional[str] = None
    name: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    product_number: Optional[int] = None
    weight_3d: Optional[Weight3DType] = None
    expected_location: Optional[str] = None
    category_id: Optional[int] = None


# УБИРАЕМ category ИЗ ProductRead — вот и вся магия!
class ProductRead(ProductBase):
    id: int
    total_quantity: int = 0
    # ← category НЕТ! Будем добавлять вручную, когда нужно
    model_config = ConfigDict(from_attributes=True)


@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(product_in: ProductCreate, db: AsyncSession = Depends(get_db)):
    # Проверка дублей
    if await db.scalar(select(Product).where(
        (Product.barcode == product_in.barcode) | (Product.sku == product_in.sku)
    )):
        raise HTTPException(400, "Barcode или SKU уже используется")

    # Проверка категории
    if product_in.category_id is not None:
        if not await db.get(ProductCategory, product_in.category_id):
            raise HTTPException(404, "Категория не найдена")

    new_product = Product(**product_in.model_dump())
    db.add(new_product)
    await db.commit()
    await db.refresh(new_product)

    # Просто возвращаем без категории — она не нужна при создании
    return ProductRead.model_validate(new_product)


@router.get("/", response_model=List[ProductRead])
async def get_products(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    in_stock: bool = False,
):
    qty_subq = (
        select(InventoryItem.product_id, func.coalesce(func.sum(InventoryItem.quantity), 0).label("total_qty"))
        .group_by(InventoryItem.product_id)
        .subquery()
    )

    query = (
        select(Product, func.coalesce(qty_subq.c.total_qty, 0))
        .outerjoin(qty_subq, Product.id == qty_subq.c.product_id)
        .options(joinedload(Product.category_rel))  # ← подгружаем!
        .order_by(Product.product_number.nulls_last(), Product.id)
    )

    if search:
        pattern = f"%{search.lower()}%"
        query = query.where(
            func.lower(Product.name).like(pattern) |
            func.lower(Product.sku).like(pattern) |
            Product.barcode.like(f"%{search}%")
        )

    if category_id is not None:
        query = query.where(Product.category_id == category_id)

    if in_stock:
        query = query.having(func.coalesce(qty_subq.c.total_qty, 0) > 0)

    result = await db.execute(query.offset(skip).limit(limit))
    
    products = []
    for product, qty in result.all():
        data = ProductRead.model_validate(product)
        data.total_quantity = int(qty)
        
        # Ручками добавляем категорию, если она подгружена
        if product.category_rel:
            data_dict = data.model_dump()
            data_dict["category"] = CategoryRead.model_validate(product.category_rel)
            data = ProductRead(**data_dict)
        
        products.append(data)
    
    return products


@router.get("/{product_id}", response_model=ProductRead)
async def get_product_by_id(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, product_id, options=[joinedload(Product.category_rel)])
    if not product:
        raise HTTPException(404, "Товар не найден")

    total = await db.scalar(
        select(func.coalesce(func.sum(InventoryItem.quantity), 0))
        .where(InventoryItem.product_id == product_id)
    )

    data = ProductRead.model_validate(product)
    data.total_quantity = int(total or 0)

    # Добавляем категорию вручную
    if product.category_rel:
        data_dict = data.model_dump()
        data_dict["category"] = CategoryRead.model_validate(product.category_rel)
        data = ProductRead(**data_dict)

    return data


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(product_id: int, product_in: ProductUpdate, db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Товар не найден")

    update_data = product_in.model_dump(exclude_unset=True)

    if {"barcode", "sku"} & update_data.keys():
        q = select(Product).where(Product.id != product_id)
        if "barcode" in update_data:
            q = q.where(Product.barcode == update_data["barcode"])
        if "sku" in update_data:
            q = q.where(Product.sku == update_data["sku"])
        if await db.scalar(q):
            raise HTTPException(400, "Barcode или SKU уже используется")

    if update_data.get("category_id") is not None:
        if update_data["category_id"] is not None and not await db.get(ProductCategory, update_data["category_id"]):
            raise HTTPException(404, "Категория не найдена")

    for k, v in update_data.items():
        setattr(product, k, v)

    await db.commit()
    await db.refresh(product, ["category_rel"])  # ← можно и так

    data = ProductRead.model_validate(product)
    data.total_quantity = 0  # или посчитай, если нужно

    if product.category_rel:
        data_dict = data.model_dump()
        data_dict["category"] = CategoryRead.model_validate(product.category_rel)
        data = ProductRead(**data_dict)

    return data


@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(404, "Товар не найден")
    await db.delete(product)
    await db.commit()
    return None