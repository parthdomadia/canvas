# Electron Packaging — Design

## Goal

Package the Canvas app as a distributable desktop installer (`.exe` on Windows, `.dmg` on Mac) that connects to a hosted FastAPI backend on Railway, so the app can be shared with others without any local server setup.

## Architecture

**Option B (hosted backend)** is implemented now. The FastAPI backend is deployed to Railway and connects to the existing Supabase cloud database. The packaged Electron app has the Railway URL baked in at build time via a Vite env variable. Both the developer and testers share the same Supabase data (acceptable for MVP testing).

**Option A1 (bundled backend)** is future scope — PyInstaller would compile FastAPI into a binary that Electron spawns locally. The codebase is structured to support it later via the same `VITE_API_BASE_URL` env var.

## File Map

| File | Change |
|---|---|
| `backend/railway.toml` | New — Railway build and start config |
| `backend/app/main.py` | Update CORS to support `ALLOW_ALL_ORIGINS` env var |
| `backend/app/config.py` | Add `allow_all_origins: bool = False` to Settings |
| `frontend/.env.development` | New — explicit localhost API URL for dev |
| `frontend/.env.production` | New — Railway API URL for production builds |
| `package.json` | Remove `extraResources`, add `mac` target to `build` config |

## Section 1: Backend Deployment on Railway

### `backend/railway.toml`

```toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
```

Railway injects `$PORT` automatically. Nixpacks auto-detects Python and installs from `requirements.txt`.

### Railway environment variables

Set in the Railway dashboard (not committed to the repo):

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Same value as local `.env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Same value as local `.env` |
| `ALLOW_ALL_ORIGINS` | `true` |

### CORS update

`backend/app/config.py` — add `allow_all_origins`:

```python
class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    allow_all_origins: bool = False

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")
```

`backend/app/main.py` — make `allow_origins` conditional:

```python
from app.config import settings

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
```

## Section 2: Frontend API URL

`VITE_API_BASE_URL` is already read in `frontend/src/api/client.ts` with a localhost fallback. Two env files control which URL is baked in at build time.

### `frontend/.env.development`

```
VITE_API_BASE_URL=http://localhost:8000
```

### `frontend/.env.production`

```
VITE_API_BASE_URL=https://<your-app>.railway.app
```

The placeholder `<your-app>.railway.app` is replaced with the actual Railway domain after the first deploy. This file is committed to the repo (it contains no secrets — the Railway URL is public).

`npm run build:frontend` automatically picks up `.env.production` via Vite's env file priority. Dev (`vite dev`) uses `.env.development`.

## Section 3: Electron Packaging

### `package.json` `build` config changes

Remove `extraResources` (was for future A1 bundling, currently breaks the build by referencing a non-existent `backend/dist/`). Add `mac` target:

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

### Build command

```bash
npm run build && electron-builder
```

`npm run build` runs:
1. `npm --prefix frontend run build` — Vite production build with `.env.production`
2. `tsc -p electron/tsconfig.json` — compiles `main.ts` and `preload.ts`

`electron-builder` then packages everything into `release/`.

### Output

| Platform | File |
|---|---|
| Windows | `release/Canvas Setup 1.0.0.exe` |
| Mac | `release/Canvas-1.0.0.dmg` |

### Distribution

Share the installer file directly (Google Drive, WeTransfer, or GitHub Releases). The recipient installs it and the app launches connected to the Railway backend with no additional setup.

## Future: Option A1 (Bundled Backend)

When ready to add offline support:
1. Add PyInstaller to `backend/requirements-build.txt`
2. Build backend binary: `pyinstaller app/main.py --onefile --name canvas-backend`
3. Add binary to `electron-builder` `extraResources`
4. Update `electron/main.ts` to spawn/kill the binary as a child process
5. Use a dynamic port, pass it to the frontend via a Vite env at runtime

The `VITE_API_BASE_URL` env var switch remains the same mechanism — pointing to `http://localhost:{port}` for A1 vs the Railway URL for B.
