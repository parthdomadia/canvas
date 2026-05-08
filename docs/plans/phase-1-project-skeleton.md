# Canvas App — Phase 1: Project Skeleton

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the full project structure — Electron window, FastAPI backend booting as a child process, Supabase connection verified, Alembic migrations applied, and a blank Konva Stage with working pan/zoom rendering in the window.

**Architecture:** Electron main process spawns a Python FastAPI server on `localhost:8000` and loads a Vite dev server (`localhost:5173`) in its renderer. In development, the backend is run manually; Electron just opens the window. The three parts (electron/, frontend/, backend/) are independently runnable.

**Tech Stack:** Electron 28, TypeScript 5, Vite 5, React 18, Konva 9, react-konva, Python 3.11, FastAPI 0.110, SQLAlchemy 2 async, asyncpg, Alembic, Supabase PostgreSQL, Tailwind CSS 3, concurrently, wait-on

---

## File Map

```
canvas/
├── package.json                          CREATE — root workspace scripts
├── .gitignore                            CREATE
├── .env.example                          CREATE
├── electron/
│   ├── tsconfig.json                     CREATE
│   ├── main.ts                           CREATE
│   └── preload.ts                        CREATE
├── frontend/
│   ├── package.json                      CREATE
│   ├── vite.config.ts                    CREATE
│   ├── tsconfig.json                     CREATE
│   ├── index.html                        CREATE
│   └── src/
│       ├── main.tsx                      CREATE
│       ├── App.tsx                       CREATE
│       └── components/
│           └── canvas/
│               └── CanvasStage.tsx       CREATE
├── backend/
│   ├── requirements.txt                  CREATE
│   ├── requirements-dev.txt              CREATE
│   ├── .env                              CREATE (gitignored)
│   ├── alembic.ini                       CREATE
│   ├── alembic/
│   │   ├── env.py                        CREATE
│   │   └── versions/
│   │       └── 001_initial_schema.py     CREATE
│   ├── app/
│   │   ├── __init__.py                   CREATE
│   │   ├── main.py                       CREATE
│   │   ├── config.py                     CREATE
│   │   └── database.py                   CREATE
│   └── tests/
│       └── test_health.py               CREATE
```

---

## Task 1: Root package.json + tooling config

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `electron/tsconfig.json`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "canvas",
  "version": "1.0.0",
  "private": true,
  "main": "dist-electron/main.js",
  "scripts": {
    "dev": "concurrently -k -n ELECTRON,FRONTEND -c cyan,green \"npm run dev:compile-electron\" \"npm run dev:frontend\" \"npm run dev:electron-run\"",
    "dev:compile-electron": "tsc --watch -p electron/tsconfig.json",
    "dev:frontend": "cd frontend && vite --port 5173",
    "dev:backend": "cd backend && uvicorn app.main:app --reload --port 8000",
    "dev:electron-run": "wait-on tcp:5173 file:dist-electron/main.js && cross-env NODE_ENV=development electron .",
    "build": "npm run build:frontend && npm run build:electron",
    "build:frontend": "cd frontend && vite build",
    "build:electron": "tsc -p electron/tsconfig.json",
    "package": "npm run build && electron-builder"
  },
  "devDependencies": {
    "concurrently": "^8.2.2",
    "cross-env": "^7.0.3",
    "electron": "^28.3.3",
    "electron-builder": "^24.13.3",
    "typescript": "^5.4.5",
    "wait-on": "^7.2.0"
  },
  "build": {
    "appId": "com.canvas.app",
    "productName": "Canvas",
    "directories": { "output": "release" },
    "files": [
      "dist-electron/**",
      "frontend/dist/**"
    ],
    "extraResources": [
      { "from": "backend/dist/", "to": "backend/" }
    ],
    "win": {
      "target": "nsis",
      "icon": "resources/icon.ico"
    }
  }
}
```

- [ ] **Step 2: Create .gitignore**

```gitignore
# Dependencies
node_modules/
frontend/node_modules/

# Build outputs
dist-electron/
frontend/dist/
release/
backend/dist/

# Python
__pycache__/
*.pyc
*.pyo
.venv/
backend/.venv/
*.egg-info/

# Env files
.env
backend/.env

# DB artifacts
*.db

# Supabase / IDE
.superpowers/
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

- [ ] **Step 3: Create .env.example**

```dotenv
# Copy to backend/.env and fill in your Supabase credentials
DATABASE_URL=postgresql+asyncpg://postgres:[password]@[host]:5432/postgres
```

- [ ] **Step 4: Create electron/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "../dist-electron",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: Install root dependencies**

```bash
cd /path/to/canvas
npm install
```

Expected: `node_modules/` created, `package-lock.json` generated.

- [ ] **Step 6: Commit**

```bash
git init
git add package.json .gitignore .env.example electron/tsconfig.json
git commit -m "feat: initialize project root with Electron + build tooling"
```

---

## Task 2: Electron main process + preload

**Files:**
- Create: `electron/main.ts`
- Create: `electron/preload.ts`

- [ ] **Step 1: Create electron/main.ts**

```typescript
import { app, BrowserWindow } from 'electron'
import path from 'path'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    titleBarStyle: 'default',
    title: 'Canvas',
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

- [ ] **Step 2: Create electron/preload.ts**

```typescript
// Minimal preload — context bridge will be extended in Phase 6 for backend IPC
import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
})
```

- [ ] **Step 3: Compile electron TypeScript**

```bash
npx tsc -p electron/tsconfig.json
```

Expected: `dist-electron/main.js` and `dist-electron/preload.js` created.

- [ ] **Step 4: Commit**

```bash
git add electron/main.ts electron/preload.ts dist-electron/
git commit -m "feat: add Electron main process and preload script"
```

---

## Task 3: Frontend scaffold (Vite + React + TypeScript)

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`

- [ ] **Step 1: Create frontend/package.json**

```json
{
  "name": "canvas-frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "konva": "^9.3.6",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-konva": "^18.2.10",
    "zustand": "^4.5.2",
    "zundo": "^2.2.0",
    "@tanstack/react-query": "^5.45.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.4.5",
    "vite": "^5.3.1",
    "vitest": "^1.6.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@testing-library/jest-dom": "^6.4.6",
    "jsdom": "^24.1.0",
    "tailwindcss": "^3.4.4",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.39"
  }
}
```

- [ ] **Step 2: Create frontend/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create frontend/tsconfig.node.json**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create frontend/vite.config.ts**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 5: Create frontend/src/test-setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Create frontend/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Canvas</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create frontend/src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 8: Create frontend/src/App.tsx (placeholder — expanded in Phase 2)**

```tsx
import { CanvasStage } from './components/canvas/CanvasStage'

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#0d0d0d' }}>
      <CanvasStage />
    </div>
  )
}
```

- [ ] **Step 9: Install frontend dependencies**

```bash
cd frontend
npm install
```

Expected: `frontend/node_modules/` created.

- [ ] **Step 10: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat: scaffold Vite + React + TypeScript frontend"
```

---

## Task 4: Blank Konva Stage with pan/zoom

**Files:**
- Create: `frontend/src/components/canvas/CanvasStage.tsx`

- [ ] **Step 1: Write the test**

Create `frontend/src/components/canvas/__tests__/CanvasStage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { CanvasStage } from '../CanvasStage'

// Konva requires a real canvas — mock it for unit tests
vi.mock('react-konva', () => ({
  Stage: ({ children, onWheel }: any) => (
    <div data-testid="konva-stage" onWheel={onWheel}>{children}</div>
  ),
  Layer: () => <div data-testid="konva-layer" />,
}))

describe('CanvasStage', () => {
  it('renders without crashing', () => {
    const { getByTestId } = render(<CanvasStage />)
    expect(getByTestId('konva-stage')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd frontend
npx vitest run src/components/canvas/__tests__/CanvasStage.test.tsx
```

Expected: `FAIL — Cannot find module '../CanvasStage'`

- [ ] **Step 3: Create frontend/src/components/canvas/CanvasStage.tsx**

```tsx
import { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer } from 'react-konva'
import Konva from 'konva'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5
const ZOOM_STEP = 1.08

interface Viewport {
  x: number
  y: number
  z: number
}

export function CanvasStage() {
  const stageRef = useRef<Konva.Stage>(null)
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, z: 1 })

  // Keep stage size in sync with window
  useEffect(() => {
    const handleResize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Zoom toward the pointer position (Figma-style)
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return

    const oldZoom = stage.scaleX()
    const pointer = stage.getPointerPosition()
    if (!pointer) return

    const direction = e.evt.deltaY < 0 ? 1 : -1
    const newZoom = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, oldZoom * (direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP)),
    )

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldZoom,
      y: (pointer.y - stage.y()) / oldZoom,
    }
    const newPos = {
      x: pointer.x - mousePointTo.x * newZoom,
      y: pointer.y - mousePointTo.y * newZoom,
    }

    stage.scale({ x: newZoom, y: newZoom })
    stage.position(newPos)
    setViewport({ x: newPos.x, y: newPos.y, z: newZoom })
  }, [])

  const handleDragEnd = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const pos = stage.position()
    setViewport(v => ({ ...v, x: pos.x, y: pos.y }))
  }, [])

  return (
    <Stage
      ref={stageRef}
      width={size.width}
      height={size.height}
      draggable
      x={viewport.x}
      y={viewport.y}
      scaleX={viewport.z}
      scaleY={viewport.z}
      onWheel={handleWheel}
      onDragEnd={handleDragEnd}
      style={{ background: '#0d0d0d' }}
    >
      {/* Layers added in Phase 2 */}
      <Layer />
    </Stage>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/components/canvas/__tests__/CanvasStage.test.tsx
```

Expected: `PASS — 1 test passed`

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/
git commit -m "feat: add blank Konva Stage with pan/zoom"
```

---

## Task 5: Backend scaffold (FastAPI + SQLAlchemy + config)

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/requirements-dev.txt`
- Create: `backend/app/__init__.py`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/app/main.py`

- [ ] **Step 1: Create backend/requirements.txt**

```
fastapi==0.111.0
uvicorn[standard]==0.30.1
sqlalchemy[asyncio]==2.0.31
asyncpg==0.29.0
alembic==1.13.2
pydantic==2.7.4
pydantic-settings==2.3.4
python-dotenv==1.0.1
```

- [ ] **Step 2: Create backend/requirements-dev.txt**

```
-r requirements.txt
pytest==8.2.2
pytest-asyncio==0.23.7
httpx==0.27.0
aiosqlite==0.20.0
```

- [ ] **Step 3: Create and activate virtual environment**

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
pip install -r requirements-dev.txt
```

Expected: All packages install without errors.

- [ ] **Step 4: Create backend/.env** (fill in your Supabase credentials)

```dotenv
DATABASE_URL=postgresql+asyncpg://postgres:[your-password]@[your-host]:5432/postgres
```

- [ ] **Step 5: Create backend/app/__init__.py**

```python
```
(empty file)

- [ ] **Step 6: Create backend/app/config.py**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
```

- [ ] **Step 7: Create backend/app/database.py**

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings

engine = create_async_engine(settings.database_url, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:  # type: ignore[return]
    async with AsyncSessionLocal() as session:
        yield session
```

- [ ] **Step 8: Create backend/app/main.py**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Canvas API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "app://.",                # Electron production
        "file://",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
```

- [ ] **Step 9: Write the health check test**

Create `backend/tests/__init__.py` (empty), then `backend/tests/conftest.py`:

```python
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    TestSession = async_sessionmaker(test_engine, expire_on_commit=False)
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
```

Create `backend/tests/test_health.py`:

```python
import pytest


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

Create `backend/pytest.ini`:

```ini
[pytest]
asyncio_mode = auto
```

- [ ] **Step 10: Run tests — expect PASS**

```bash
cd backend
pytest tests/test_health.py -v
```

Expected:
```
PASSED tests/test_health.py::test_health
1 passed
```

- [ ] **Step 11: Verify backend starts**

```bash
uvicorn app.main:app --reload --port 8000
```

Expected: `Uvicorn running on http://127.0.0.1:8000`. Visit `http://localhost:8000/health` → `{"status":"ok"}`. Stop with Ctrl+C.

- [ ] **Step 12: Commit**

```bash
cd ..
git add backend/
git commit -m "feat: add FastAPI backend scaffold with health endpoint"
```

---

## Task 6: Database models + Alembic migration

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/canvas.py`
- Create: `backend/app/models/node.py`
- Create: `backend/app/models/edge.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Create: `backend/alembic/versions/001_initial_schema.py`

- [ ] **Step 1: Create backend/app/models/__init__.py**

```python
from .canvas import Canvas
from .edge import Edge
from .node import Node

__all__ = ["Canvas", "Edge", "Node"]
```

- [ ] **Step 2: Create backend/app/models/canvas.py**

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Canvas(Base):
    __tablename__ = "canvases"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String, nullable=False, default="Untitled Canvas")
    viewport_x: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    viewport_y: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    viewport_z: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 3: Create backend/app/models/node.py**

```python
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Node(Base):
    __tablename__ = "nodes"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    canvas_id: Mapped[str] = mapped_column(String, ForeignKey("canvases.id", ondelete="CASCADE"), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    x: Mapped[float] = mapped_column(Float, nullable=False)
    y: Mapped[float] = mapped_column(Float, nullable=False)
    width: Mapped[float] = mapped_column(Float, nullable=False, default=200.0)
    height: Mapped[float] = mapped_column(Float, nullable=False, default=120.0)
    color: Mapped[str] = mapped_column(String(50), nullable=False, default="default")
    z_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 4: Create backend/app/models/edge.py**

```python
import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Edge(Base):
    __tablename__ = "edges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    canvas_id: Mapped[str] = mapped_column(String, ForeignKey("canvases.id", ondelete="CASCADE"), nullable=False)
    source_id: Mapped[str] = mapped_column(String, ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    target_id: Mapped[str] = mapped_column(String, ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False)
    label: Mapped[str | None] = mapped_column(Text, nullable=True)
    style: Mapped[str] = mapped_column(String(50), nullable=False, default="solid")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint("source_id != target_id", name="no_self_loop"),
    )
```

- [ ] **Step 5: Create backend/alembic.ini**

```ini
[alembic]
script_location = alembic
prepend_sys_path = .
version_path_separator = os
sqlalchemy.url = driver://user:pass@localhost/dbname

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

- [ ] **Step 6: Create backend/alembic/env.py**

```python
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.config import settings
from app.database import Base
import app.models  # noqa: F401 — ensures all models are registered

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 7: Create backend/alembic/versions/001_initial_schema.py**

```python
"""Initial schema: canvases, nodes, edges

Revision ID: 001
Revises:
Create Date: 2026-05-07
"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "canvases",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("title", sa.String(), nullable=False, server_default="Untitled Canvas"),
        sa.Column("viewport_x", sa.Float(), nullable=False, server_default="0"),
        sa.Column("viewport_y", sa.Float(), nullable=False, server_default="0"),
        sa.Column("viewport_z", sa.Float(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )

    op.create_table(
        "nodes",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("canvas_id", sa.String(), sa.ForeignKey("canvases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content", sa.Text(), nullable=False, server_default=""),
        sa.Column("x", sa.Float(), nullable=False),
        sa.Column("y", sa.Float(), nullable=False),
        sa.Column("width", sa.Float(), nullable=False, server_default="200"),
        sa.Column("height", sa.Float(), nullable=False, server_default="120"),
        sa.Column("color", sa.String(50), nullable=False, server_default="default"),
        sa.Column("z_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("idx_nodes_canvas_id", "nodes", ["canvas_id"])

    op.create_table(
        "edges",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("canvas_id", sa.String(), sa.ForeignKey("canvases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_id", sa.String(), sa.ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_id", sa.String(), sa.ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.Text(), nullable=True),
        sa.Column("style", sa.String(50), nullable=False, server_default="solid"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.CheckConstraint("source_id != target_id", name="no_self_loop"),
    )
    op.create_index("idx_edges_canvas_id", "edges", ["canvas_id"])
    op.create_index("idx_edges_source", "edges", ["source_id"])
    op.create_index("idx_edges_target", "edges", ["target_id"])


def downgrade() -> None:
    op.drop_table("edges")
    op.drop_table("nodes")
    op.drop_table("canvases")
```

- [ ] **Step 8: Apply migration to Supabase**

```bash
cd backend
alembic upgrade head
```

Expected:
```
INFO  [alembic.runtime.migration] Running upgrade  -> 001, Initial schema: canvases, nodes, edges
```

Verify in Supabase dashboard: Tables `canvases`, `nodes`, `edges` now exist.

- [ ] **Step 9: Commit**

```bash
cd ..
git add backend/app/models/ backend/alembic.ini backend/alembic/
git commit -m "feat: add SQLAlchemy models and Alembic migration for canvases/nodes/edges"
```

---

## Task 7: Smoke test — full stack running

This task verifies all three parts start and talk to each other before Phase 2 begins.

- [ ] **Step 1: Start backend**

```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

Expected: `Uvicorn running on http://127.0.0.1:8000`

- [ ] **Step 2: Start frontend (new terminal)**

```bash
cd frontend && npm run dev
```

Expected: `Local: http://localhost:5173/`

- [ ] **Step 3: Start Electron (new terminal)**

First compile:
```bash
npx tsc -p electron/tsconfig.json
```

Then run:
```bash
cross-env NODE_ENV=development npx electron .
```

Expected: Electron window opens, shows the React app (dark background), Konva stage visible. Pan with mouse drag works. Zoom with scroll wheel works.

- [ ] **Step 4: Run all backend tests**

```bash
cd backend && pytest -v
```

Expected:
```
PASSED tests/test_health.py::test_health
1 passed
```

- [ ] **Step 5: Run all frontend tests**

```bash
cd frontend && npm test
```

Expected:
```
PASS src/components/canvas/__tests__/CanvasStage.test.tsx
1 passed
```

- [ ] **Step 6: Commit phase completion**

```bash
cd ..
git add .
git commit -m "feat: Phase 1 complete — full stack skeleton with pan/zoom canvas"
```

---

## Phase 1 Checklist

- [ ] Root `package.json` with dev/build scripts
- [ ] `.gitignore`, `.env.example`
- [ ] Electron `main.ts` opens a window loading Vite dev server
- [ ] `preload.ts` compiled and loaded
- [ ] Vite + React + TypeScript frontend boots on `localhost:5173`
- [ ] Konva `Stage` renders with pan (drag) and zoom-to-cursor (scroll) working
- [ ] FastAPI boots on `localhost:8000`, `/health` returns `{"status":"ok"}`
- [ ] SQLAlchemy models defined for Canvas, Node, Edge
- [ ] Alembic migration applied to Supabase — tables exist in DB
- [ ] Backend tests pass (1 test)
- [ ] Frontend tests pass (1 test)
- [ ] All three parts run simultaneously without conflict
