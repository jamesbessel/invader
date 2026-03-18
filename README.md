# Invader 👾

A Space Invaders clone built with FastAPI and JavaScript Canvas.

🎮 **Play it live:** https://invader.onrender.com

## Features
- Classic Space Invaders gameplay
- Special glowing aliens worth bonus points
- Double fire power-up for 10 seconds
- Sound effects
- Progressive difficulty per level

## Quick View

- To play it... Invader is deployed on render at https://invader-rad9.onrender.com


## Quick Start for running local. 

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
