# app/api/v1/auth.py
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database.db import get_db
from model.model import User
from context.context import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login")
async def login(
    username: str,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    # Правильный async-запрос
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()  # или .first() — но scalar_one_or_none() безопаснее

    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(f"user:{user.id}")
    return {"access_token": token, "token_type": "bearer"}


# === Pydantic схемы ===
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str | None = None

class RegisterResponse(BaseModel):
    username: str
    email: str
    full_name: str | None
    role: str = "operator"
    message: str = "User created successfully"


# === Регистрация ===
@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=RegisterResponse)
async def register(user_data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # Проверяем, нет ли уже такого username
    exists = await db.execute(select(User).where(User.username == user_data.username))
    if exists.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Username already taken"
        )

    # Проверяем email
    exists = await db.execute(select(User).where(User.email == user_data.email))
    if exists.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # Создаём пользователя
    hashed = hash_password(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed,
        full_name=user_data.full_name or user_data.username,
        role="operator",  # можно потом сделать /admin/register с проверкой токена
        is_active=True
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return RegisterResponse(
        username=new_user.username,
        email=new_user.email,
        full_name=new_user.full_name
    )