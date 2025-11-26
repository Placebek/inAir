# app/api/v1/ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from core.websocket_manager import manager
from context.context import decode_token
from database.db import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from sqlalchemy import select

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):

    drone_id = None
    user_id = None
    db: AsyncSession | None = None

    try:
        await websocket.accept()
        print("\n===== Новое WebSocket подключение =====")

        # 1. Получаем первый пакет
        try:
            first_msg = await websocket.receive_json()
        except Exception as e:
            print("Ошибка чтения первого JSON:", e)
            await websocket.close(code=1003, reason="Bad JSON")
            return

        token = first_msg.get("token")
        print("Получен токен:", token)

        if not token:
            await websocket.close(code=1008, reason="No token provided")
            print("Токен отсутствует — отключение")
            return

        # 2. Декодируем токен
        try:
            payload = decode_token(token)
        except Exception as e:
            print("Ошибка декодирования токена:", e)
            await websocket.close(code=1008, reason="Token invalid")
            return

        sub = payload.get("sub")
        print("SUB:", sub)

        # 3. Открываем БД-сессию
        async for session in get_db():
            db = session
            break

        if not db:
            print("НЕ УДАЛОСЬ ПОЛУЧИТЬ БД-СЕССИЮ")
            await websocket.close(code=1011, reason="DB fail")
            return

        # 4. Авторизация
        if sub.startswith("drone:"):
            drone_id = int(sub.split(":")[1])
            manager.connect_drone(websocket, drone_id)
            await websocket.send_json({"type": "connected", "role": "drone", "drone_id": drone_id})
            print(f"Дрон #{drone_id} подключён")

        elif sub.startswith("user:"):
            user_id = int(sub.split(":")[1])
            manager.connect_frontend(websocket)
            await websocket.send_json({"type": "connected", "role": "operator"})
            print(f"Оператор #{user_id} подключён")

        else:
            print("Неизвестная роль, отключение")
            await websocket.close(code=1008)
            return

        # 5. Основной цикл
        while True:
            try:
                data = await websocket.receive_json()
            except WebSocketDisconnect:
                raise
            except Exception as e:
                print("Ошибка чтения JSON:", e)
                continue

            print("\n=== Получено сообщение ===")
            print(data)

            if drone_id:
                data["drone_id"] = drone_id

            # ======== СКАН ШТРИХКОДА ========
            if data.get("type") == "barcode_scan" and drone_id:
                print("→ Обработка штрихкода:", data.get("barcode"))
                await handle_barcode_scan(db, data, drone_id)
                continue

            # ======== ТЕЛЕМЕТРИЯ ========
            if data.get("type") == "telemetry":
                print("→ Телеметрия получена, пересылаю фронтенду")
                await manager.broadcast_to_frontends(data)
                continue

            # ======== ПРОЧИЕ СОБЫТИЯ ========
            print("→ Общее событие, пересылаю фронтенду")
            await manager.broadcast_to_frontends(data)

    except WebSocketDisconnect:
        print("\n=== WebSocketDisconnect ===")
        if drone_id:
            print(f"Дрон #{drone_id} отключился")
            manager.disconnect_drone(drone_id)
            await manager.broadcast_to_frontends({
                "type": "drone_offline",
                "drone_id": drone_id
            })
        else:
            print("Оператор отключился")

    except Exception as e:
        print("\n=== Критическая ошибка WebSocket ===")
        print(e)

    finally:
        if db:
            print("Закрываю БД-сессию...")
            await db.close()
        print("Подключение закрыто\n")


async def handle_barcode_scan(db: AsyncSession, data: dict, drone_id: int):
    from model.model import Product, InventoryItem, ScanSession

    barcode = data.get("barcode", "").strip()

    print(f"[SCAN] Дрон #{drone_id} сканирует: '{barcode}'")

    if not barcode:
        print("[SCAN] Пустой штрихкод — игнорирую")
        return

    # Поиск товара
    product = (await db.execute(
        select(Product).where(Product.barcode == barcode)
    )).scalar_one_or_none()

    if not product:
        print("[SCAN] ТОВАР НЕ НАЙДЕН:", barcode)
        await manager.broadcast_to_frontends({
            "type": "scan_result",
            "status": "unknown",
            "barcode": barcode,
            "message": "Товар не найден",
            "drone_id": drone_id,
            "timestamp": datetime.utcnow().isoformat()
        })
        return

    print("[SCAN] Найден товар:", product.name)

    # Ищем открытой сессии
    session = (await db.execute(
        select(ScanSession).where(
            ScanSession.drone_id == drone_id,
            ScanSession.status == "running"
        )
    )).scalar_one_or_none()

    if not session:
        session = ScanSession(
            drone_id=drone_id,
            started_at=datetime.utcnow(),
            status="running"
        )
        db.add(session)
        await db.flush()
        print("[SCAN] Создана новая сессия №", session.id)

    # Обновление инвентаря
    item = (await db.execute(
        select(InventoryItem).where(InventoryItem.product_id == product.id)
    )).scalar_one_or_none()

    if not item:
        print("[SCAN] Товар впервые найден → создаю запись в инвентаре")
        item = InventoryItem(
            product_id=product.id,
            location="UNKNOWN",
            quantity=1,
            last_scanned=datetime.utcnow(),
            scan_session_id=session.id
        )
        db.add(item)
    else:
        print(f"[SCAN] Обновление количества: было {item.quantity}, стало {item.quantity + 1}")
        item.quantity += 1
        item.last_scanned = datetime.utcnow()

    # Обновляем счётчик сессии
    session.total_items_scanned = (session.total_items_scanned or 0) + 1
    print("[SCAN] Обновлён счётчик сессии:", session.total_items_scanned)

    await db.commit()
    print("[SCAN] Коммит выполнен")

    # Отправка результата фронту
    await manager.broadcast_to_frontends({
        "type": "scan_result",
        "status": "success",
        "product_name": product.name,
        "sku": product.sku or "-",
        "quantity": item.quantity,
        "total_scanned": session.total_items_scanned,
        "barcode": barcode,
        "drone_id": drone_id,
        "timestamp": datetime.utcnow().isoformat()
    })
    print("[SCAN] Результат отправлен фронтендам")
