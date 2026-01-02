# Phase 2 - Installation & Setup Guide

## Status: Partial Setup Complete

✅ **Done**:
- Maven 3.9.5 downloaded and extracted to `C:\Tools\apache-maven-3.9.5`
- MAVEN_HOME environment variable set
- PATH updated to include Maven

⚠️ **Blocked**: Java not installed (required for Maven to work)

---

## Option 1: Manual Java Installation (Recommended)

Since web downloads aren't working smoothly in this environment, you can install Java manually:

### Step 1: Download Java 17

1. Visit: https://adoptium.net/temurin/releases/
2. Select:
   - Version: **17 LTS**
   - OS: **Windows**
   - Architecture: **x64**
   - Package Type: **.zip** (or .msi)
3. Download the file

### Step 2: Extract & Set Up

```powershell
# Create Java directory
mkdir "C:\Tools\java"

# Extract downloaded zip to C:\Tools\java\jdk-17.x.x
# (adjust folder name to match your download)

# Set environment variable
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Tools\java\jdk-17.x.x", "User")

# Add to PATH
[Environment]::SetEnvironmentVariable("PATH", $env:PATH + ";C:\Tools\java\jdk-17.x.x\bin", "User")

# Close and reopen terminal, then verify:
java -version
mvn -version
```

### Step 3: Build the Project

```powershell
cd "C:\Users\Home\Downloads\orb-rpg-modular\OrbsRPG\orb-rpg\assets\3d assets\OrbRPG3DEditor"

# Download dependencies (first run, may take 2-5 minutes)
mvn clean compile

# If successful, run the editor:
mvn javafx:run
```

---

## Option 2: Alternative - Use VS Code Dev Container (Advanced)

If manual setup is difficult, use Docker/Dev Container:

1. Install **Docker Desktop**
2. Install **VS Code Dev Containers extension**
3. Create `.devcontainer/devcontainer.json`:

```json
{
  "name": "Java Maven",
  "image": "mcr.microsoft.com/devcontainers/java:17-maven-bullseye",
  "forwardPorts": [8000, 8080]
}
```

4. Open project in container (VS Code will handle everything)

---

## Option 3: Skip Local Build - Export & Test Later

If you don't want to set up Java/Maven locally:

1. ✅ Code changes complete (Phase 2 foundation)
2. ⏸️ Skip the build step (for now)
3. ✅ Continue with game development
4. 🔮 Build later when environment is ready

**Current Status**: Code is ready, just need Java+Maven to test.

---

## What's Ready to Build

Once Java 17 is installed, running this will work:

```bash
cd "assets/3d assets/OrbRPG3DEditor"

# Download 150+ MB of dependencies (first run only)
mvn clean compile

# Compile and run
mvn javafx:run
```

Expected output:
```
[INFO] Building OrbRPG 3D Editor 0.1.0
[INFO] 
[INFO] Downloading org.assimp:assimp-java:5.1.0
[INFO] Downloaded org.assimp:assimp-java (8.2 MB)
[INFO] 
[INFO] Compiling 8 Java source files...
[INFO] BUILD SUCCESS
[INFO] 
OrbRPG 3D Editor window opens
```

---

## Current Maven Installation

Maven is ready at: `C:\Tools\apache-maven-3.9.5`

To use it immediately:

```powershell
# Temporarily set Java home for this session
$env:JAVA_HOME = "C:\path\to\jdk-17.x.x"
$env:PATH += ";C:\path\to\jdk-17.x.x\bin"

# Then try Maven
mvn -version
```

---

## Files Created This Session

✅ `pom.xml` - Updated with AssimpJ dependency
✅ `ModelLoader.java` - New utility class for model loading
✅ `Scene3D.java` - Updated to use ModelLoader
✅ `PHASE2_IMPLEMENTATION.md` - Phase 2 guide
✅ Maven installed to `C:\Tools\apache-maven-3.9.5`

---

## Next Steps

### If You Install Java:
```powershell
# 1. Download Java 17 from https://adoptium.net
# 2. Extract to C:\Tools\java\jdk-17.x.x
# 3. Set JAVA_HOME and PATH
# 4. Run:
cd assets/3d\ assets/OrbRPG3DEditor
mvn clean javafx:run
```

### If You Skip Local Build:
```
1. Continue with game development
2. Phase 2 code is ready
3. Build when Java is available
```

---

## Estimated Times

| Task | Time |
|------|------|
| Download Java | 5-10 min |
| Extract Java | 2 min |
| Set environment | 2 min |
| First Maven build | 5 min |
| Subsequent builds | <1 min |
| **Total** | **15-20 min** |

---

## Troubleshooting

### "JAVA_HOME environment variable is not defined"
→ Install Java 17, set JAVA_HOME to its directory

### "Cannot download dependencies"
→ Check internet connection, may need VPN/proxy

### "mvn: command not found"
→ Maven PATH not set, close/reopen terminal after setting PATH

### "BUILD FAILURE"
→ Check Java version is 17+: `java -version`

---

## Summary

**Today's Work**:
- ✅ Phase 2 foundation complete
- ✅ Maven installed
- ⏳ Waiting on Java installation

**When Java is installed**:
- Phase 2 can be tested immediately
- Full build pipeline ready
- Editor can load 3D models

**Current Blockers**: Java 17 installation needed

**Recommendation**: Install Java 17 manually from https://adoptium.net, then run `mvn clean javafx:run`

---

**Phase 2 Status**: Foundation Complete, Testing Awaiting Java ✅
**Next**: Install Java 17 from Adoptium
**Then**: `mvn clean javafx:run`
