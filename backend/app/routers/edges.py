import uuid

from fastapi import APIRouter, Depends, HTTPException
from supabase import AsyncClient

from app.database import get_supabase
from app.schemas.edge import EdgeCreate, EdgePatch, EdgeResponse

router = APIRouter(tags=["edges"])


@router.post("/canvases/{canvas_id}/edges", status_code=201)
async def create_edge(
    canvas_id: str,
    body: EdgeCreate,
    supabase: AsyncClient = Depends(get_supabase),
) -> EdgeResponse:
    if body.source_id == body.target_id:
        raise HTTPException(status_code=422, detail="Self-loops are not allowed")

    check = await supabase.table("canvases").select("id").eq("id", canvas_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Canvas not found")

    edge_id = str(uuid.uuid4())
    result = await supabase.table("edges").insert({
        "id": edge_id,
        "canvas_id": canvas_id,
        "source_id": body.source_id,
        "target_id": body.target_id,
        "label": body.label,
        "style": body.style,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create edge")

    return EdgeResponse(**result.data[0])


@router.patch("/edges/{edge_id}")
async def update_edge(
    edge_id: str,
    body: EdgePatch,
    supabase: AsyncClient = Depends(get_supabase),
) -> EdgeResponse:
    check = await supabase.table("edges").select("id").eq("id", edge_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Edge not found")

    update_data = body.model_dump(exclude_unset=True)
    result = await supabase.table("edges").update(update_data).eq("id", edge_id).execute()
    return EdgeResponse(**result.data[0])


@router.delete("/edges/{edge_id}", status_code=204)
async def delete_edge(
    edge_id: str,
    supabase: AsyncClient = Depends(get_supabase),
) -> None:
    check = await supabase.table("edges").select("id").eq("id", edge_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Edge not found")
    await supabase.table("edges").delete().eq("id", edge_id).execute()
