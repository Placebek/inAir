# app/api/v1/products.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from sqlalchemy import select, func
from typing import List, Optional, Literal
from database.db import get_db
from model.model import Product, ProductCategory
# from app.api.deps import get_current_admin_user  # раскомментируй, если нужно

# ========================================
# Pydantic схемы
# ========================================
from pydantic import BaseModel, Field, ConfigDict

Weight3DType = Literal["small_box", "medium_box", "large_box", "pallet", "unknown"]


class CategoryRead(BaseModel):
    id: int
    category_name: str

    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    barcode: str = Field(..., max_length=100, example="4601234567890")
    name: str = Field(..., max_length=200, example="Кронштейн для ТВ 32-55\"")
    sku: str = Field(..., max_length=50, example="TV-BR-001")
    description: Optional[str] = Field(None)
    price: float = Field(0.0, ge=0, example=2490.0)
    weight_3d: Weight3DType = Field("unknown")
    expected_location: Optional[str] = Field(None, max_length=100, example="A-12-3")
    category_id: Optional[int] = Field(None)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    barcode: Optional[str] = Field(None, max_length=100)
    name: Optional[str] = Field(None, max_length=200)
    sku: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    price: Optional[float] = Field(None, ge=0)
    weight_3d: Optional[Weight3DType] = None
    expected_location: Optional[str] = None
    category_id: Optional[int] = None


class ProductRead(ProductBase):
    id: int
    # ← ВАЖНО: используем alias + populate_by_name
    category: Optional[CategoryRead] = Field(None, alias="category_rel")

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True  # ← Это включает поддержку alias!
    )


# ========================================
# Роутер
# ========================================
router = APIRouter(prefix="/products", tags=["products"])


@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: ProductCreate,
    db: AsyncSession = Depends(get_db),
    # current_user = Depends(get_current_admin_user)
):
    # Проверка на дубли barcode/sku
    exists = await db.scalar(
        select(Product).where(
            (Product.barcode == product_in.barcode) |
            (Product.sku == product_in.sku)
        )
    )
    if exists:
        raise HTTPException(status_code=400, detail="Barcode или SKU уже используется")

    if product_in.category_id:
        cat = await db.get(ProductCategory, product_in.category_id)
        if not cat:
            raise HTTPException(status_code=404, detail="Категория не найдена")

    new_product = Product(**product_in.model_dump())
    db.add(new_product)
    await db.commit()
    await db.refresh(new_product)

    # Подгружаем категорию одним запросом
    result = await db.execute(
        select(Product)
        .options(joinedload(Product.category_rel))
        .where(Product.id == new_product.id)
    )
    product = result.scalars().unique().one()
    return product


@router.get("/", response_model=List[ProductRead])
async def get_products(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    weight_3d: Optional[Weight3DType] = Query(None),
):
    query = (
        select(Product)
        .options(joinedload(Product.category_rel))  # ← Подгружаем связь!
        .order_by(Product.name)
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
    if weight_3d:
        query = query.where(Product.weight_3d == weight_3d)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    products = result.scalars().unique().all()
    return products  # ← Pydantic сам положит category_rel → category


@router.get("/{product_id}", response_model=ProductRead)
async def get_product_by_id(product_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Product)
        .options(joinedload(Product.category_rel))
        .where(Product.id == product_id)
    )
    product = result.scalars().unique().one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    return product


@router.patch("/{product_id}", response_model=ProductRead)
async def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: AsyncSession = Depends(get_db),
):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")

    update_data = product_in.model_dump(exclude_unset=True)

    # Проверка уникальности
    if any(k in update_data for k in ("barcode", "sku")):
        q = select(Product).where(Product.id != product_id)
        if "barcode" in update_data:
            q = q.where(Product.barcode == update_data["barcode"])
        if "sku" in update_data:
            q = q.where(Product.sku == update_data["sku"])
        if await db.scalar(q):
            raise HTTPException(status_code=400, detail="Barcode или SKU уже используется")

    if "category_id" in update_data and update_data["category_id"] is not None:
        cat = await db.get(ProductCategory, update_data["category_id"])
        if not cat:
            raise HTTPException(status_code=404, detail="Категория не найдена")

    for k, v in update_data.items():
        setattr(product, k, v)

    await db.commit()
    await db.refresh(product)

    result = await db.execute(
        select(Product)
        .options(joinedload(Product.category_rel))
        .where(Product.id == product.id)
    )
    return result.scalars().unique().one()


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: int, db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")
    await db.delete(product)
    await db.commit()
    return None