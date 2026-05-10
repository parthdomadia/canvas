# Electron Packaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the FastAPI backend to Railway and package the Electron app as a distributable installer that connects to the hosted backend, so the app can be shared with others without any local server setup.

**Architecture:** The FastAPI backend is deployed to Railway (connects to existing Supabase cloud DB). The packaged Electron app has the Railway URL baked in at Vite build time via `VITE_API_BASE_URL`. CORS is made configurable via an env var so production allows all origins while local dev stays strict. Tasks must be done in order: backend code → Railway deploy (get URL) → frontend env files → packaging config → build.

**Tech Stack:** FastAPI + pydantic-settings, Railway (nixpacks), Vite env files, electron-builder (NSIS/DMG)

---

## File Map

| File | Change |
|---|---|
| `backend/app/config.py` | Add `allow_all_origins: bool = False` to `Settings` |
| `backend/app/main.py` | Make `allow_origins` conditional on `settings.allow_all_origins` |
| `backend/tests/test_cors.py` | New — 4 tests for CORS config and origin behavior |
| `backend/railway.toml` | New — Railway build and start config |
| `frontend/.env.development` | New — explicit localhost API URL |
| `frontend/.env.production` | New — Railway API URL (filled in after Task 3) |
| `package.json` | Remove `extraResources`, add `mac` target |

---

### Task 1: Backend CORS — make allow_all_origins configurable

**Files:**
- Modify: `backend/app/config.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_cors.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_cors.py`:

```python
import pytest
from unittest.mock import patch
from app.config import Settings


def test_allow_all_origins_defaults_false():
    s = Settings(supabase_url="http://x", supabase_service_role_key="key")
    assert s.allow_all_origins is False


def test_allow_all_origins_reads_from_env():
    with patch.dict("os.environ", {"ALLOW_ALL_ORIGINS": "true"}):
        s = Settings(supabase_url="http://x", supabase_service_role_key="key")
        assert s.allow_all_origins is True


@pytest.mark.asyncio
async def test_cors_allows_localhost(client):
    response = await client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


@pytest.mark.asyncio
async def test_cors_allows_electron_app_origin(client):
    response = await client.options(
        "/health",
        headers={
            "Origin": "app://.",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") == "app://."
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && .venv/Scripts/python -m pytest tests/test_cors.py -v
```

Expected: `test_allow_all_origins_defaults_false` FAILS (field doesn't exist yet), others may fail too.

- [ ] **Step 3: Update config.py**

Replace the contents of `backend/app/config.py` with:

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    allow_all_origins: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
```

- [ ] **Step 4: Update main.py**

Replace the contents of `backend/app/main.py` with:

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import canvases, edges, nodes

app = FastAPI(title="Canvas API", version="1.0.0")

origins = ["*"] if settings.allow_all_origins else [
    "http://localhost:5173",
    "app://.",
    "file://",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(canvases.router, prefix="/api/v1")
app.include_router(nodes.router, prefix="/api/v1")
app.include_router(edges.router, prefix="/api/v1")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd backend && .venv/Scripts/python -m pytest tests/test_cors.py -v
```

Expected: 4/4 PASS

- [ ] **Step 6: Run the full test suite to confirm no regressions**

```bash
cd backend && .venv/Scripts/python -m pytest -v
```

Expected: all existing tests still pass.

- [ ] **Step 7: Commit**

```bash
git add backend/app/config.py backend/app/main.py backend/tests/test_cors.py
git commit -m "feat: make CORS allow_all_origins configurable via env var"
```

---

### Task 2: Railway deployment config

**Files:**
- Create: `backend/railway.toml`

- [ ] **Step 1: Create railway.toml**

Create `backend/railway.toml`:

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
```

Nixpacks auto-detects Python from `requirements.txt` and installs all dependencies. Railway injects `$PORT` automatically.

- [ ] **Step 2: Commit**

```bash
git add backend/railway.toml
git commit -m "feat: add Railway deployment config"
```

---

### Task 3: Deploy to Railway and get the URL

This task is manual. No code changes. Follow each step exactly.

- [ ] **Step 1: Push the current branch to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Create a new Railway project**

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project → Deploy from GitHub repo**
3. Select your canvas repository
4. When asked for the root directory, set it to **`backend`**
5. Railway will detect Python and start the first deploy (it will fail — env vars not set yet)

- [ ] **Step 3: Set environment variables in Railway dashboard**

In the Railway project → **Variables** tab, add:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Same value as in `backend/.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Same value as in `backend/.env` |
| `ALLOW_ALL_ORIGINS` | `true` |

Railway will automatically redeploy after saving.

- [ ] **Step 4: Get the Railway domain**

In the Railway project → **Settings → Networking**, click **Generate Domain**. You'll get a URL like `https://canvas-backend-production-xxxx.railway.app`.

- [ ] **Step 5: Verify the backend is live**

```bash
curl https://<your-railway-url>.railway.app/health
```

Expected response:
```json
{"status": "ok"}
```

If the deploy failed, check Railway's **Logs** tab. Common issues:
- Missing env vars → add them in Railway Variables
- Import errors → check that `requirements.txt` lists all packages

**Save this Railway URL — you need it for Task 4.**

---

### Task 4: Frontend env files

**Files:**
- Create: `frontend/.env.development`
- Create: `frontend/.env.production`

Prerequisites: Task 3 must be complete. You need the Railway URL.

- [ ] **Step 1: Create frontend/.env.development**

Create `frontend/.env.development`:

```
VITE_API_BASE_URL=http://localhost:8000
```

This makes local dev explicit (Vite already falls back to this via the `??` in `client.ts`, but the file documents the intent).

- [ ] **Step 2: Create frontend/.env.production**

Create `frontend/.env.production` — replace `<your-railway-url>` with the actual URL from Task 3:

```
VITE_API_BASE_URL=https://<your-railway-url>.railway.app
```

Example:
```
VITE_API_BASE_URL=https://canvas-backend-production-xxxx.railway.app
```

- [ ] **Step 3: Verify the production build picks up the URL**

```bash
cd frontend && npx vite build 2>&1 | head -20
```

Expected: build completes without errors. The Railway URL is now baked into `frontend/dist/`.

To double-check the URL is in the bundle:

```bash
grep -r "railway.app" frontend/dist/assets/*.js | head -3
```

Expected: one or more matches showing the Railway URL is baked in.

- [ ] **Step 4: Run frontend tests to confirm nothing broke**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/.env.development frontend/.env.production
git commit -m "feat: add frontend env files for dev and production API URLs"
```

---

### Task 5: Update package.json build config

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update the build config in package.json**

Open `package.json`. The current `build` section is:

```json
"build": {
  "appId": "com.canvas.app",
  "productName": "Canvas",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist-electron/**",
    "frontend/dist/**"
  ],
  "extraResources": [
    {
      "from": "backend/dist/",
      "to": "backend/"
    }
  ],
  "win": {
    "target": "nsis"
  }
}
```

Replace it with (removing `extraResources`, adding `mac` target):

```json
"build": {
  "appId": "com.canvas.app",
  "productName": "Canvas",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist-electron/**",
    "frontend/dist/**"
  ],
  "win": {
    "target": "nsis"
  },
  "mac": {
    "target": "dmg"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "feat: update electron-builder config for hosted backend packaging"
```

---

### Task 6: Build and package the Electron app

No file changes — this is a build verification task.

- [ ] **Step 1: Run the full build**

From the repo root:

```bash
npm run build
```

This runs two commands in sequence:
1. `npm --prefix frontend run build` — Vite production build (bakes Railway URL in)
2. `tsc -p electron/tsconfig.json` — compiles `electron/main.ts` and `electron/preload.ts`

Expected: no errors. Output folders `frontend/dist/` and `dist-electron/` are populated.

- [ ] **Step 2: Package with electron-builder**

```bash
npx electron-builder
```

Expected: `release/` directory is created containing:
- **Windows:** `release/Canvas Setup 1.0.0.exe`
- **Mac:** `release/Canvas-1.0.0.dmg`

Note: electron-builder builds for the current platform only. To build a Windows `.exe`, run this on Windows. To build a Mac `.dmg`, run on Mac.

- [ ] **Step 3: Smoke-test the packaged app**

Run the installer:
- **Windows:** Double-click `release/Canvas Setup 1.0.0.exe`, install, launch Canvas
- **Mac:** Open `release/Canvas-1.0.0.dmg`, drag to Applications, launch Canvas

Verify:
- App window opens
- Canvas loads (nodes visible if any exist in Supabase)
- Creating a node saves successfully (no network errors in devtools — open with `Ctrl+Shift+I`)

- [ ] **Step 4: Share with friend**

Send the installer file directly (Google Drive, WeTransfer, or email). Friend installs it — no terminal, no Python, no setup required. They connect to the same Supabase data as you.

- [ ] **Step 5: Commit release notes (optional)**

```bash
git tag v1.0.0
git push origin main --tags
```
