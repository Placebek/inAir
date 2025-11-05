from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import create_engine
from core.config import settings

# Асинхронное подключение для FastAPI
async_engine = create_async_engine(
    url=settings.DATABASE_URL_asyncpg,
    echo=False
)

async_session_factory = async_sessionmaker(
    bind=async_engine,
    expire_on_commit=False
)

# Синхронное подключение для Celery
DATABASE_URL_sync = settings.DATABASE_URL_asyncpg.replace("postgresql+asyncpg", "postgresql+psycopg2")
sync_engine = create_engine(
    url=DATABASE_URL_sync,
    echo=False
)

sync_session_factory = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session_factory() as session:
        yield session

def get_sync_db():
    db = sync_session_factory()
    try:
        yield db
    finally:
        db.close()