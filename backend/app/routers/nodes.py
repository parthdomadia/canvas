import uuid

from fastapi import APIRouter, Depends, HTTPException
from supabase import AsyncClient

from app.database import get_supabase
from app.schemas.node import BatchPositionUpdate, NodeCreate, NodePatch, NodeResponse

router = APIRouter(tags=["nodes"])


@router.post("/canvases/{canvas_id}/nodes", status_code=201)
async def create_node(
    canvas_id: str,
    body: NodeCreate,
    supabase: AsyncClient = Depends(get_supabase),
) -> NodeResponse:
    check = await supabase.table("canvases").select("id").eq("id", canvas_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Canvas not found")

    node_id = str(uuid.uuid4())
    result = await supabase.table("nodes").insert({
        "id": node_id,
        "canvas_id": canvas_id,
        "content": body.content,
        "x": body.x,
        "y": body.y,
        "width": body.width,
        "height": body.height,
        "color": body.color,
        "z_index": 0,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create node")

    return NodeResponse(**result.data[0])


@router.patch("/nodes/{node_id}")
async def update_node(
    node_id: str,
    body: NodePatch,
    supabase: AsyncClient = Depends(get_supabase),
) -> NodeResponse:
    check = await supabase.table("nodes").select("id").eq("id", node_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Node not found")

    update_data = body.model_dump(exclude_unset=True)
    result = await supabase.table("nodes").update(update_data).eq("id", node_id).execute()
    return NodeResponse(**result.data[0])


@router.delete("/nodes/{node_id}", status_code=204)
async def delete_node(
    node_id: str,
    supabase: AsyncClient = Depends(get_supabase),
) -> None:
    check = await supabase.table("nodes").select("id").eq("id", node_id).execute()
    if not check.data:
        raise HTTPException(status_code=404, detail="Node not found")
    await supabase.table("nodes").delete().eq("id", node_id).execute()


@router.patch("/canvases/{canvas_id}/nodes/batch")
async def batch_update_positions(
    canvas_id: str,
    body: BatchPositionUpdate,
    supabase: AsyncClient = Depends(get_supabase),
) -> dict:
    for update in body.updates:
        await supabase.table("nodes").update({"x": update.x, "y": update.y}).eq("id", update.id).eq("canvas_id", canvas_id).execute()
    return {"updated": len(body.updates)}
