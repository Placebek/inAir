from fastapi import APIRouter, File, UploadFile
import shutil, uuid, os
from fastapi.responses import FileResponse
from app.api.v1.model.best import predict_image
from ultralytics import YOLO



router = APIRouter(
    prefix="/analyz",
    tags=["photo-analyz"],
)

UPLOAD_DIR = "uploads"
RESULT_DIR = "runs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(RESULT_DIR, exist_ok=True)

model = YOLO("D:/inAir/app/api/v1/model/best.pt")


@router.post("/analyz")
async def predict(file: UploadFile = File(...)):
    # временный файл
    ext = file.filename.split('.')[-1]
    temp_name = f"{uuid.uuid4()}.{ext}"
    temp_path = os.path.join(UPLOAD_DIR, temp_name)

    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # вызов predict — сохраняем размеченное фото сразу
    results = model.predict(
        source=temp_path,
        iou=0.6,
        imgsz=640,
        save=True,
        save_dir=RESULT_DIR,  # вот здесь сохраняется фото
        name=temp_name.split(".")[0],
        exist_ok=True
    )

    r = results[0]
    num_boxes = len(r.boxes) if r.boxes is not None else 0

    # путь к сохраненному фото
    # predict сохраняет как <save_dir>/<name>/filename.jpg
    saved_img_path = os.path.join(RESULT_DIR, temp_name.split(".")[0], temp_name)

    # удаляем временный загруженный файл
    os.remove(temp_path)

    return {
        "count": num_boxes,
        "image_path": saved_img_path  # по этому пути можно отдать фото
    }

@router.get("/image/{filename}")
async def get_image(filename: str):
    # поиск изображения
    for root, dirs, files in os.walk(RESULT_DIR):
        if filename in files:
            return FileResponse(os.path.join(root, filename))
    return {"error": "File not found"}