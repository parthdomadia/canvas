# Canvas App — Phase 6: Electron Packaging

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A single `.exe` installer that launches the app as a standalone desktop window — no terminal, no Python install required. Electron spawns the bundled FastAPI backend automatically on launch and kills it on quit.

**Depends on:** Phase 5 complete

---

## Task 1: python-runner.ts

- [ ] Create `electron/python-runner.ts`
  - In production: find the PyInstaller binary at `path.join(process.resourcesPath, 'backend', 'canvas-backend.exe')` (Windows)
  - In dev: skip — backend is run manually with uvicorn
  - Spawn the binary as a child process, pipe stdout/stderr to Electron's console
  - Export `startBackend()` and `stopBackend()`
- [ ] Update `electron/main.ts`:
  - Import and call `startBackend()` in `app.whenReady()` (production only)
  - Call `stopBackend()` in `app.on('will-quit')`

---

## Task 2: Loading screen while backend warms up

- [ ] Add a "starting backend..." loading screen in the renderer before the canvas loads
  - `CanvasPage` already shows a loading state while TanStack Query fetches — extend this
  - In production, the first `getOrCreateCanvas()` call will fail until the backend is ready
  - Configure TanStack Query retry with exponential backoff (3 retries, 1s/2s/4s) — this naturally waits for the backend to boot
- [ ] Optionally: use Electron IPC to signal from main process when backend is healthy (ping `/health` in `python-runner.ts` before signalling ready)

---

## Task 3: PyInstaller backend binary

- [ ] Add `pyinstaller` to `backend/requirements-dev.txt`
- [ ] Create `backend/canvas.spec` (PyInstaller spec file):
  - Entry point: `backend/app/main.py` wrapped in a uvicorn launcher script
  - Create `backend/run.py` as the entry point:
    ```python
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000)
    ```
  - One-file or one-dir bundle (one-dir is faster to start)
  - Name the output `canvas-backend`
  - Hidden imports: `asyncpg`, `sqlalchemy`, `alembic`, `pydantic_settings`
- [ ] Build and test the binary locally:
  ```bash
  cd backend
  pyinstaller canvas.spec
  # Test: dist/canvas-backend/canvas-backend.exe
  ```
- [ ] Verify binary starts FastAPI and `/health` responds

---

## Task 4: Electron Builder config

- [ ] Confirm `package.json` `build` section is correct (already set up in Phase 1):
  - `files`: `dist-electron/**`, `frontend/dist/**`
  - `extraResources`: `{ from: "backend/dist/canvas-backend/", to: "backend/" }`
  - `win.target`: `nsis`
- [ ] Add app icon: place `resources/icon.ico` (256×256 minimum)
- [ ] Add `build:backend` script to `package.json`:
  ```json
  "build:backend": "cd backend && pyinstaller canvas.spec --distpath ../backend/dist"
  ```
- [ ] Update `package` script:
  ```json
  "package": "npm run build:backend && npm run build && electron-builder"
  ```

---

## Task 5: Full package build + install test

- [ ] Run the full package build:
  ```bash
  npm run package
  ```
  Expected: `release/Canvas Setup x.x.x.exe` created
- [ ] Install the `.exe` on Windows
- [ ] Launch the installed app — verify:
  - [ ] App opens as a standalone window (no terminal)
  - [ ] Loading screen shows briefly while backend starts
  - [ ] Canvas loads, existing notes appear
  - [ ] Create/edit/delete nodes — all work
  - [ ] Close app — backend process terminates (check Task Manager)
  - [ ] Reopen — notes still persist from Supabase

---

## Task 6: Final cleanup + commit

- [ ] Ensure `.env` is in `.gitignore` (it is — verified in Phase 1)
- [ ] Add `.env.example` reminder to README if one exists
- [ ] Final `git add . && git commit -m "feat: Phase 6 complete — Electron + PyInstaller standalone .exe packaging"`
