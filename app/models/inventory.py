from pydantic import BaseModel
from datetime import datetime

class InventoryItem(BaseModel):
    id: int | None = None
    name: str
    count: int
    location: str
    timestamp: datetime | None = None

    class Config:
        from_attributes = True