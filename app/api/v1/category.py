# app/api/v1/product_category.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import List, Optional
from database.db import get_db
from model.model import ProductCategory
from app.api.deps import get_current_user  # или get_current_admin_user (если нужно только админам)

# ========================================
# Pydantic схемы
# ========================================
from pydantic import BaseModel, Field, ConfigDict


class ProductCategoryBase(BaseModel):
    category_name: str = Field(..., max_length=100, example="Стойки", description="Название категории")


class ProductCategoryCreate(ProductCategoryBase):
    pass


class ProductCategoryUpdate(BaseModel):
    category_name: Optional[str] = Field(None, max_length=100, example="Металлические стойки")


class ProductCategoryRead(ProductCategoryBase):
    id: int

    model_config = ConfigDict(from_attributes=True)  # pydantic v2


# ========================================
# Роутер
# ========================================
router = APIRouter(
    prefix="/product-categories",
    tags=["product-categories"],
)


@router.post(
    "/",
    response_model=ProductCategoryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать новую категорию товаров",
)
async def create_product_category(
    category_in: ProductCategoryCreate,
    db: AsyncSession = Depends(get_db),
    # current_user = Depends(get_current_admin_user)  # раскомментируй, если нужно только админам
):
    """Создаёт новую категорию. Название должно быть уникальным."""
    # Проверка на дубликат по имени
    exists = await db.scalar(
        select(ProductCategory).where(
            func.lower(ProductCategory.category_name) == category_in.category_name.strip().lower()
        )
    )
    if exists:
        raise HTTPException(
            status_code=400,
            detail=f"Категория с названием '{category_in.category_name}' уже существует"
        )

    new_category = ProductCategory(category_name=category_in.category_name.strip())
    db.add(new_category)
    await db.commit()
    await db.refresh(new_category)
    return new_category


@router.get("/", response_model=List[ProductCategoryRead])
async def get_product_categories(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = Query(None, description="Поиск по названию категории"),
):
    """Получить список всех категорий с фильтрацией и пагинацией"""
    query = select(ProductCategory).order_by(ProductCategory.category_name)

    if search:
        pattern = f"%{search.lower()}%"
        query = query.where(func.lower(ProductCategory.category_name).like(pattern))

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    categories = result.scalars().all()
    return categories


@router.get("/{category_id}", response_model=ProductCategoryRead)
async def get_product_category_by_id(
    category_id: int,
    db: AsyncSession = Depends(get_db)
):
    category = await db.get(ProductCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    return category


@router.patch("/{category_id}", response_model=ProductCategoryRead)
async def update_product_category(
    category_id: int,
    category_in: ProductCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    # current_user = Depends(get_current_admin_user)
):
    category = await db.get(ProductCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    if category_in.category_name is not None:
        new_name = category_in.category_name.strip()
        if new_name.lower() != category.category_name.lower():
            # Проверяем, не занято ли новое имя
            exists = await db.scalar(
                select(ProductCategory).where(
                    func.lower(ProductCategory.category_name) == new_name.lower(),
                    ProductCategory.id != category_id
                )
            )
            if exists:
                raise HTTPException(
                    status_code=400,
                    detail=f"Категория с названием '{new_name}' уже существует"
                )
        category.category_name = new_name

    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    # current_user = Depends(get_current_admin_user)
):
    category = await db.get(ProductCategory, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Категория не найдена")

    # Опционально: можно проверить, есть ли товары в этой категории
    # если да — запретить удаление или переместить в "Без категории"

    await db.delete(category)
    await db.commit()
    return None