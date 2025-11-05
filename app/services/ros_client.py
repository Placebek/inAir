import asyncio
import json
import httpx
from rclpy.node import Node
import rclpy
from sensor_msgs.msg import Image, PointCloud2
from nav_msgs.msg import OccupancyGrid, Odometry
from cv_bridge import CvBridge
import cv2
import base64
import numpy as np

class ROSClient(Node):
    def __init__(self, fastapi_url: str):
        super().__init__('ros_client')
        self.fastapi_url = fastapi_url
        self.bridge = CvBridge()
        self.inventory = {}  # Локальный кэш инвентаря
        self.client = httpx.AsyncClient()

        # Подписка на топики
        self.create_subscription(Image, '/camera', self.camera_callback, 10)
        self.create_subscription(PointCloud2, '/camera/depth/points', self.points_callback, 10)
        self.create_subscription(OccupancyGrid, '/map', self.map_callback, 10)
        self.create_subscription(Odometry, '/odom', self.odom_callback, 10)

    async def camera_callback(self, msg):
        # Обработка YOLO-детекций (предполагается, что YOLO публикует JSON в /camera/info)
        cv_image = self.bridge.imgmsg_to_cv2(msg, desired_encoding='bgr8')
        # Здесь должен быть вызов YOLO (например, через внешний сервис)
        detections = self.mock_yolo(cv_image)  # Заглушка
        for item in detections:
            self.inventory[item['name']] = item
            await self.client.post(f"{self.fastapi_url}/inventory/update", json=item)

    async def map_callback(self, msg):
        # Отправка SLAM-карты
        map_data = base64.b64encode(np.array(msg.data, dtype=np.int8).tobytes()).decode('utf-8')
        map_info = {
            "data": map_data,
            "width": msg.info.width,
            "height": msg.info.height,
            "resolution": msg.info.resolution
        }
        await self.client.post(f"{self.fastapi_url}/map", json=map_info)

    async def odom_callback(self, msg):
        # Отправка позиции дрона
        drone_data = {
            "id": 1,  # Для MVP один дрон
            "position_x": msg.pose.pose.position.x,
            "position_y": msg.pose.pose.position.y,
            "status": "active"
        }
        await self.client.post(f"{self.fastapi_url}/drones/update", json=drone_data)

    def mock_yolo(self, image):
        # Заглушка для YOLO (замените на реальную модель)
        return [{"name": "box", "count": 5, "location": "A1"}]