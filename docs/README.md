# Orb RPG (Modular Option A)

## Run (recommended)
### 1) Python
Open a terminal in this folder and run:
python -m http.server 8000

Then open:
http://localhost:8000

### 2) VS Code Live Server
Open folder in VS Code, right-click index.html -> "Open with Live Server".

## Where to edit what
- src/main.js = entry point
- src/engine/* = canvas/input/loop/util
- src/game/game.js = main gameplay logic (update, combat, loot, spawns)
- src/game/render.js = all drawing
- src/game/ui.js = UI overlays + inventory + menu

This is a starter refactor: the Skills + Level screens are intentionally stubbed to keep the split clean.
Next step is to split those overlays into their own modules (skills_ui.js, level_ui.js).
