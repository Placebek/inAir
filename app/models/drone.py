from pydantic import BaseModel
from datetime import datetime

class DroneStatus(BaseModel):
    id: int
    position_x: float
    position_y: float
    status: str
    last_update: datetime | None = None

    class Config:
        from_attributes = True