from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database.db import Base

# =========================================
# 1. Пользователи и роли
# =========================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(String(20), default="operator")  # admin, operator, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Связи
    drones = relationship("Drone", back_populates="owner", cascade="all, delete-orphan")
    logs = relationship("Log", back_populates="user", cascade="all, delete-orphan")


# =========================================
# 2. Статические данные дрона (редко меняются)
# =========================================
class Drone(Base):
    __tablename__ = "drones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False)           # "drone-01", "x500-warehouse"
    serial_number = Column(String(100), unique=True)                 # физический SN
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    model = Column(String(50), default="PX4 x500 + OakD-Lite")       # описание железа
    status = Column(String(20), default="offline")                   # offline, idle, flying, charging, error
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Связи
    owner = relationship("User", back_populates="drones")
    logs = relationship("Log", back_populates="drone", cascade="all, delete-orphan")
    telemetry = relationship("DroneTelemetry", back_populates="drone", uselist=False, cascade="all, delete-orphan")
    scans = relationship("ScanSession", back_populates="drone", cascade="all, delete-orphan")
    # inventory items привязаны к продукту/сессии, не напрямую к дрону


# =========================================
# 3. Телеметрия дрона (обновляется 1–10 Гц)
# =========================================
class DroneTelemetry(Base):
    __tablename__ = "drone_telemetry"

    drone_id = Column(Integer, ForeignKey("drones.id"), primary_key=True)
    position_x = Column(Float, default=0.0)
    position_y = Column(Float, default=0.0)
    position_z = Column(Float, default=0.0)
    velocity_x = Column(Float, default=0.0)
    velocity_y = Column(Float, default=0.0)
    velocity_z = Column(Float, default=0.0)
    battery_level = Column(Float)           # в процентах
    battery_voltage = Column(Float)         # если есть
    heading = Column(Float)                 # yaw в градусах
    last_update = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Одна запись на дрон (перезаписывается)
    drone = relationship("Drone", back_populates="telemetry")


# =========================================
# 4. Товары (продукты)
# =========================================
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    barcode = Column(String(100), unique=True, index=True, nullable=False)  # EAN13, QR и т.д.
    name = Column(String(200), nullable=False)
    sku = Column(String(50), unique=True, index=True)  # внутренний артикул
    description = Column(Text)
    category = Column(String(50))  # "Электроника", "Одежда" и т.д.
    price = Column(Float, default=0.0)
    weight_3d = Column(String(50))  # small_box, medium_box, large_box — из твоей YOLO-модели
    expected_location = Column(String(100))  # например: "Стеллаж A-12"

    # Связи
    items = relationship("InventoryItem", back_populates="product", cascade="all, delete-orphan")


# =========================================
# 5. Экземпляры товаров на складе
# =========================================
class InventoryItem(Base):
    __tablename__ = "inventory_items"
    __table_args__ = (UniqueConstraint('product_id', 'location', name='unique_product_location'),)

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location = Column(String(100), nullable=False)  # "A-12-3", "Полка 5"
    quantity = Column(Integer, default=1)
    last_scanned = Column(DateTime)
    scan_session_id = Column(Integer, ForeignKey("scan_sessions.id"))

    # Связи
    product = relationship("Product", back_populates="items")
    scan_session = relationship("ScanSession", back_populates="items")


# =========================================
# 6. Сессии сканирования (по полёту дрона)
# =========================================
class ScanSession(Base):
    __tablename__ = "scan_sessions"

    id = Column(Integer, primary_key=True, index=True)
    drone_id = Column(Integer, ForeignKey("drones.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    total_items_scanned = Column(Integer, default=0)
    status = Column(String(20), default="running")  # running, completed, failed

    # Связи
    drone = relationship("Drone", back_populates="scans")
    items = relationship("InventoryItem", back_populates="scan_session", cascade="all, delete-orphan")


# =========================================
# 7. Логи действий
# =========================================
class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    drone_id = Column(Integer, ForeignKey("drones.id"), nullable=True)
    action = Column(String(100), nullable=False)  # "scan_completed", "login", "drone_takeoff"
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="logs")
    drone = relationship("Drone", back_populates="logs")
# =========================================