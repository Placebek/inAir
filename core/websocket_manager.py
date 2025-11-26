# app/core/ws_manager.py
from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        self.frontends: List[WebSocket] = []
        self.drones: Dict[int, WebSocket] = {}  # drone_id → websocket

    async def connect_frontend(self, ws: WebSocket):
        await ws.accept()
        self.frontends.append(ws)

    async def connect_drone(self, ws: WebSocket, drone_id: int):
        await ws.accept()
        self.drones[drone_id] = ws
        print(f"Дрон {drone_id} подключился")

    def disconnect_drone(self, drone_id: int):
        if drone_id in self.drones:
            del self.drones[drone_id]
            print(f"Дрон {drone_id} отключился")

    async def send_to_drone(self, drone_id: int, message: dict):
        ws = self.drones.get(drone_id)
        if ws:
            await ws.send_json(message)

    async def broadcast_to_frontends(self, message: dict):
        for ws in self.frontends[:]:
            try:
                await ws.send_json(message)
            except:
                self.frontends.remove(ws)

    async def broadcast(self, message: dict):
        await self.broadcast_to_frontends(message)
        # можно и дронам слать, если нужно

manager = ConnectionManager()