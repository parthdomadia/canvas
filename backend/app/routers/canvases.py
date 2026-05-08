import uuid

from fastapi import APIRouter, Depends, HTTPException
from supabase import AsyncClient

from app.database import get_supabase
from app.schemas.canvas import (
    CanvasCreate,
    CanvasFullResponse,
    CanvasMetaResponse,
    CanvasPatch,
    ViewportData,
)
from app.schemas.edge import EdgeResponse
from app.schemas.node import NodeResponse

router = APIRouter(tags=["canvases"])


@router.post("/canvases", status_code=201)
async def create_canvas(
    body: CanvasCreate,
    supabase: AsyncClient = Depends(get_supabase),
) -> CanvasFullResponse:
    canvas_id = str(uuid.uuid4())
    result = await supabase.table("canvases").insert({
        "id": canvas_id,
        "title": body.title,
        "viewport_x": 0.0,
        "viewport_y": 0.0,
        "viewport_z": 1.0,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create canvas")

    c = result.data[0]
    return CanvasFullResponse(
        id=c["id"],
        title=c["title"],
        viewport=ViewportData(x=c["viewport_x"], y=c["viewport_y"], z=c["viewport_z"]),
        nodes=[],
        edges=[],
    )


@router.get("/canvases/{canvas_id}")
async def get_canvas(
    canvas_id: str,
    supabase: AsyncClient = Depends(get_supabase),
) -> CanvasFullResponse:
    canvas_res = await supabase.table("canvases").select("*").eq("id", canvas_id).execute()
    if not canvas_res.data:
        raise HTTPException(status_code=404, detail="Canvas not found")

    c = canvas_res.data[0]
    nodes_res = await supabase.table("nodes").select("*").eq("canvas_id", canvas_id).execute()
    edges_res = await supabase.table("edges").select("*").eq("canvas_id", canvas_id).execute()

    return CanvasFullResponse(
        id=c["id"],
        title=c["title"],
        viewport=ViewportData(x=c["viewport_x"], y=c["viewport_y"], z=c["viewport_z"]),
        nodes=[NodeResponse(**n) for n in nodes_res.data],
        edges=[EdgeResponse(**e) for e in edges_res.data],
    )


@router.patch("/canvases/{canvas_id}")
async def update_canvas(
    canvas_id: str,
    body: CanvasPatch,
    supabase: AsyncClient = Depends(get_supabase),
) -> CanvasMetaResponse:
    check = await supabase.table("canvases").select("id").eq("id", canvas_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Canvas not found")

    update_data = body.model_dump(exclude_unset=True)
    result = await supabase.table("canvases").update(update_data).eq("id", canvas_id).execute()

    c = result.data[0]
    return CanvasMetaResponse(
        id=c["id"],
        title=c["title"],
        viewport=ViewportData(x=c["viewport_x"], y=c["viewport_y"], z=c["viewport_z"]),
    )
