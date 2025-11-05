from pydantic import BaseModel

class WarehouseMap(BaseModel):
    data: str  # base64-encoded OccupancyGrid
    width: int
    height: int
    resolution: float