# Invader

A Space Invaders clone built with FastAPI and JavaScript Canvas.

## Quick Start

```bash
# Install dependencies
uv sync

# Run the game server
uv run uvicorn main:app --reload

# Open in browser
http://localhost:8000
```

## Project Structure

- `main.py` - FastAPI server with WebSocket support
- `templates/` - HTML template
- `static/css/` - Game styles
- `static/js/` - Game logic (canvas, game loop, collision detection)
- `static/images/` - Sprite images
- `tests/` - pytest tests

## Tech Stack

- FastAPI - web server
- WebSockets - real-time game state
- JavaScript Canvas API - game rendering
- uv - Python package management
