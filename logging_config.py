from fastapi import FastAPI, Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import os
import json
from datetime import datetime
from zoneinfo import ZoneInfo

# Настройка логирования
LOG_DIR = "logs"
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

LOG_FILE = os.path.join(LOG_DIR, f"app_{datetime.now().strftime('%Y-%m-%d')}.log")

logging.basicConfig(
    level=logging.DEBUG,  # Устанавливаем DEBUG для детального логирования
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger("printbox")

app = FastAPI()

# Middleware для логирования тела запроса
class LogRequestBodyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "POST" and request.url.path.endswith("/callback"):
            try:
                # Читаем сырое тело запроса
                body = await request.body()
                try:
                    # Пытаемся распарсить как JSON
                    body_json = json.loads(body.decode('utf-8'))
                    logger.debug(f"Raw request body for {request.url.path}: {json.dumps(body_json, indent=2, ensure_ascii=False)}")
                except json.JSONDecodeError:
                    # Если не JSON, логируем как строку
                    logger.debug(f"Raw request body (non-JSON) for {request.url.path}: {body.decode('utf-8', errors='replace')}")
                except Exception as e:
                    logger.error(f"Error reading request body: {str(e)}")
            except Exception as e:
                logger.error(f"Error processing request body: {str(e)}")

        response = await call_next(request)
        return response

# Добавляем middleware в приложение
app.add_middleware(LogRequestBodyMiddleware)