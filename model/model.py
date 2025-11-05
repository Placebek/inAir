from sqlalchemy import Column, Integer, String, Float, DateTime
from database.db import Base
from datetime import datetime

class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    count = Column(Integer)
    location = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

class Drone(Base):
    __tablename__ = "drones"
    id = Column(Integer, primary_key=True, index=True)
    position_x = Column(Float)
    position_y = Column(Float)
    status = Column(String)
    last_update = Column(DateTime, default=datetime.utcnow)

class Log(Base):
    __tablename__ = "logs"
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String)
    details = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)