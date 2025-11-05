from fastapi import FastAPI, Depends, WebSocket, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from database.db import get_db
from app.models.inventory import InventoryItem
from app.models.drone import DroneStatus
from app.models.map import WarehouseMap
from model.model import Inventory, Drone
import json
import asyncio
from jose import JWTError, jwt
from datetime import datetime, timedelta
import csv
from io import StringIO

app = FastAPI()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
SECRET_KEY = "your-secret-key"  # Замените на безопасный ключ
ALGORITHM = "HS256"

# Аутентификация
async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Эндпоинты
@app.post("/inventory/update")
async def update_inventory(item: InventoryItem, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    db_item = db.query(Inventory).filter(Inventory.name == item.name).first()
    if db_item:
        db_item.count = item.count
        db_item.location = item.location
        db_item.timestamp = datetime.utcnow()
    else:
        db_item = Inventory(**item.dict())
        db.add(db_item)
    db.commit()
    return {"status": "updated", "count": item.count}

@app.get("/inventory")
async def get_inventory(db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    return db.query(Inventory).all()

@app.post("/drones/update")
async def update_drone(drone: DroneStatus, db: Session = Depends(get_db)):
    db_drone = db.query(Drone).filter(Drone.id == drone.id).first()
    if db_drone:
        db_drone.position_x = drone.position_x
        db_drone.position_y = drone.position_y
        db_drone.status = drone.status
        db_drone.last_update = datetime.utcnow()
    else:
        db_drone = Drone(**drone.dict())
        db.add(db_drone)
    db.commit()
    return {"status": "updated"}

@app.get("/drones")
async def get_drones(db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    return db.query(Drone).all()

@app.post("/map")
async def update_map(map_data: WarehouseMap):
    # Сохранение карты (например, в файл или БД)
    with open("map.json", "w") as f:
        json.dump(map_data.dict(), f)
    return {"status": "map updated"}

@app.get("/reports/csv")
async def export_csv(db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    items = db.query(Inventory).all()
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "name", "count", "location", "timestamp"])
    for item in items:
        writer.writerow([item.id, item.name, item.count, item.location, item.timestamp])
    return {"csv": output.getvalue()}

# WebSockets
@app.websocket("/ws/inventory")
async def websocket_inventory(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    while True:
        items = db.query(Inventory).all()
        low_stock = [item for item in items if item.count < 5]
        await websocket.send_json({
            "inventory": [item.__dict__ for item in items],
            "alerts": [{"name": item.name, "count": item.count} for item in low_stock]
        })
        await asyncio.sleep(2)

@app.websocket("/ws/drones")
async def websocket_drones(websocket: WebSocket, db: Session = Depends(get_db)):
    await websocket.accept()
    while True:
        drones = db.query(Drone).all()
        await websocket.send_json([drone.__dict__ for drone in drones])
        await asyncio.sleep(2)