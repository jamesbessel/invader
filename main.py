from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import json

app = FastAPI(
    title="Invader",
    description="Space Invaders clone built with FastAPI",
    version="0.1.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# Active WebSocket connections
active_connections: list[WebSocket] = []

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            # Echo game events back - game logic runs client side
            await websocket.send_text(json.dumps({
                "status": "ok",
                "event": message
            }))
    except WebSocketDisconnect:
        active_connections.remove(websocket)

@app.get("/health")
async def health():
    return {"status": "running", "active_connections": len(active_connections)}
