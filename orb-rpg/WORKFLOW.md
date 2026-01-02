# OrbRPG Development Workflow - Unified Environment

## Quick Start: Run Both Game & Editor

### Terminal Setup (2 Tabs)

**Terminal 1: Game Server**
```bash
cd "C:\Users\Home\Downloads\orb-rpg-modular\OrbsRPG\orb-rpg"
npm start
# Opens: http://localhost:8000
```

**Terminal 2: Java 3D Editor**
```bash
cd "C:\Users\Home\Downloads\orb-rpg-modular\OrbsRPG\orb-rpg\assets\3d assets\OrbRPG3DEditor"
mvn clean javafx:run
# Opens: OrbRPG 3D Editor window
```

**Running**: Both windows open side-by-side
- Game: Left side (http://localhost:8000)
- Editor: Right side (Java window)

---

## Asset Creation Workflow

### Step 1: Create/Edit in Java Editor
```
1. Java Editor window → File → Open Model
2. Select .glb file from assets/3d assets/chars/
3. Adjust with Property Panel (lighting, rotation)
4. Inspect statistics in Inspector Panel
```

### Step 2: Export Model
```
File → Export Model
Destination: C:\Users\Home\Downloads\orb-rpg-modular\OrbsRPG\orb-rpg\assets\3d assets\chars\
Filename: [CharacterName].glb
```

### Step 3: Test in Game
```
1. Game Browser (already running): Press F5 (refresh)
2. Navigate to inventory or character select
3. Verify 3D model appears correctly
4. Check performance and positioning
```

### Step 4: Iterate
```
Make changes in Editor → Export → F5 in Browser → Repeat
```

---

## Common Tasks

### Restart Game Server
```bash
Terminal 1: Ctrl+C
Terminal 1: npm start
Browser: F5 (or Ctrl+R)
```

### Restart Java Editor
```bash
Terminal 2: Ctrl+C
Terminal 2: mvn clean javafx:run
```

### Full Clean Build (Both)
```bash
Terminal 1: Ctrl+C → npm install → npm start
Terminal 2: Ctrl+C → mvn clean install → mvn javafx:run
```

### Check Game Logs
```
Terminal 1: Output shows request logs
Browser DevTools: F12 → Console tab (JavaScript errors)
```

### Check Editor Logs
```
Terminal 2: Output shows model loading progress
Java errors appear in terminal
```

---

## Keyboard Shortcuts (Quick Reference)

### In Game Browser
| Shortcut | Action |
|----------|--------|
| F5 | Refresh game |
| F12 | Open DevTools (console logs) |
| Esc | Close menu |
| I | Open inventory |
| C | Character select |

### In Java Editor
| Shortcut | Action |
|----------|--------|
| Ctrl+O | Open Model (File menu) |
| Ctrl+E | Export Model (File menu) |
| R | Reset view (in viewport) |
| Space | Toggle auto-rotation |
| L | Lighting slider focus |

### In VS Code (Workspace)
| Shortcut | Action |
|----------|--------|
| Ctrl+` | Toggle terminal |
| Ctrl+Tab | Switch open file |
| Ctrl+Shift+P | Command palette |

---

## File Locations Quick Reference

```
Game Files:
  src/game/game.js           ← Main game logic
  src/game/ui.js             ← Inventory/UI
  style.css                  ← Game styling
  index.html                 ← Entry point

3D Assets:
  assets/3d assets/chars/    ← Character models (.glb files)
  assets/char/               ← Character images (.png/.svg)
  assets/items/              ← Item models (future)

Java Editor:
  assets/3d assets/OrbRPG3DEditor/
    ├── src/main/java/       ← Java source
    ├── pom.xml              ← Build config
    └── BUILD.md             ← Build instructions
```

---

## Testing Checklist

### After Exporting New Model

- [ ] File exists in `assets/3d assets/chars/`
- [ ] File size reasonable (< 5MB)
- [ ] Game loads without errors (Terminal 1 - no 404s)
- [ ] Model visible in game viewport
- [ ] Model positioned correctly
- [ ] Performance acceptable (60 FPS)
- [ ] No console errors (F12 in browser)

---

## Troubleshooting Quick Tips

### Game Won't Start
```bash
# Check if port 8000 is in use
netstat -ano | findstr :8000

# If in use, kill process or use different port
# Or: npx http-server -p 8001
```

### Java Editor Won't Start
```bash
# Check Java version
java -version  # Should be 17+

# Clear Maven cache
rmdir /s /q "%USERPROFILE%\.m2\repository\org\openjfx"

# Rebuild
mvn clean install
mvn javafx:run
```

### Model Not Loading in Game (Phase 3+)
```
1. Check browser console (F12)
2. Verify file path is correct
3. Ensure .glb file is valid (test in Java editor)
4. Check file permissions
5. Try clearing browser cache (Ctrl+Shift+Delete)
```

### Editor Canvas Not Rendering
```
1. Check Terminal 2 for errors
2. Verify JavaFX is installed (mvn dependency:tree)
3. Ensure graphics driver is up to date
4. Try: mvn clean javafx:run
```

---

## Development Tips

### Real-time Testing
Keep both windows visible:
- Java Editor on right (narrow, ~30% width)
- Browser on left (wide, ~70% width)
- Makes iteration fast

### Browser DevTools
Open DevTools for game development:
```
F12 → Console tab
Watch for model loading messages (when Phase 3 complete)
Check network tab for asset loads
```

### Maven Dependency Check
```bash
mvn dependency:tree | findstr javafx
# Shows what's installed
```

### Java Version Check
```bash
java -version
# Must show 17 or higher
```

---

## Workflow by Phase

### Phase 1 (UI Complete) ✅
- Editor: Run and verify panels display
- Game: Run normally, no 3D integration yet

### Phase 2 (Model Loading) ⏳
- Editor: Load/export models
- Game: Still no integration
- Workflow: Editor → File management only

### Phase 3 (Game Integration) 🔮
- Editor: Export models to chars/
- Game: Load models with Three.js
- Workflow: Create → Export → Test → Iterate

### Phase 4 (Advanced) 🔮
- Editor: Full animation editor
- Game: Play animations
- Workflow: Complex asset creation and testing

---

## Multi-Task Management

### If Working on Game Code
```
1. Keep Java Editor closed (save RAM)
2. Focus Terminal 1 on game
3. Edit src/game/*.js files
4. Refresh browser (F5) to test
```

### If Working on 3D Models
```
1. Keep both terminals running
2. Focus on Java Editor window
3. Create/edit models
4. Export frequently
5. Refresh browser to verify
```

### If Working on Game UI + 3D
```
1. Run both terminals
2. Make game UI changes
3. Export model updates
4. Refresh browser (F5)
5. Verify everything works
```

---

## Performance Tips

### Reduce Resource Usage
```bash
# If editor is slow:
Terminal 2: mvn clean javafx:run  (clears cache)

# If game is slow:
Browser: Close DevTools (F12)
Browser: Clear cache (Ctrl+Shift+Delete)
```

### Monitor Performance
```
Game: Browser DevTools → Performance tab
  - Record session
  - Check FPS
  - Identify bottlenecks

Editor: Check Terminal 2 output
  - Look for rendering times
  - Watch memory usage
```

---

## Quick Command Reference

### Navigation
```bash
# To game folder
cd orb-rpg

# To editor folder
cd orb-rpg\assets\3d\ assets\OrbRPG3DEditor

# Back to workspace root
cd ..
```

### Build Commands
```bash
# Game
npm start           # Start dev server
npm stop            # Stop server (Ctrl+C)
npm test            # Run tests (if configured)

# Editor
mvn clean           # Clear build
mvn install         # Build project
mvn javafx:run      # Run application
mvn test            # Run tests
```

### Verification
```bash
# Verify game is running
curl http://localhost:8000
# Should return HTML

# Verify editor built
mvn dependency:tree -q
# Shows dependencies resolved
```

---

## Debugging Setup

### Browser Debugging (Game)
```
1. Press F12
2. Go to Console tab
3. Type in console to test JavaScript
4. Set breakpoints in Sources tab
5. Watch Network tab for asset loads
```

### IDE Debugging (Editor)
```
In VS Code with Java Extension:
1. Open Scene3D.java
2. Click line number to set breakpoint
3. Run: Debug → Start Debugging
4. Step through code
```

### Terminal Debugging
```
Game logs: Terminal 1 shows request logs
Editor logs: Terminal 2 shows rendering info
Both: Use console.log() (game) or System.out.println() (editor)
```

---

## Checklist: First Time Setup

- [ ] Clone/open workspace
- [ ] Terminal 1: `npm start` (game on :8000)
- [ ] Terminal 2: `mvn javafx:run` (editor window opens)
- [ ] Browse to localhost:8000 in browser
- [ ] See game interface
- [ ] See Java editor window
- [ ] Both windows side-by-side
- [ ] Ready to develop!

---

## Checklist: Before Committing Code

- [ ] Game builds without errors (`npm install`)
- [ ] Game runs without errors (`npm start`)
- [ ] Editor builds without errors (`mvn clean install`)
- [ ] Editor runs without errors (`mvn javafx:run`)
- [ ] No console errors in browser (F12)
- [ ] No errors in Terminal 2
- [ ] Assets in correct folders
- [ ] Documentation updated
- [ ] Ready to push!

---

## Next Steps

### To Start Development Now
```bash
# Terminal 1
npm start

# Terminal 2 (separate terminal)
cd assets/3d\ assets/OrbRPG3DEditor
mvn clean javafx:run
```

### Then
1. Open browser to localhost:8000
2. Arrange windows side-by-side
3. Start creating!

---

**Last Updated**: 2024
**Workflow Version**: 1.0
**Status**: Ready for Phase 2 development
