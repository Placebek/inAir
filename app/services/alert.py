from fastapi import WebSocket
from model.model import Inventory

async def check_alerts(db, websocket: WebSocket):
    items = db.query(Inventory).filter(Inventory.count < 5).all()
    if items:
        await websocket.send_json({
            "alerts": [{"name": item.name, "count": item.count, "location": item.location} for item in items]
        })