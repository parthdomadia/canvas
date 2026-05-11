from pydantic import BaseModel


class EdgeCreate(BaseModel):
    source_id: str
    target_id: str
    label: str | None = None
    style: str = "solid"
    edge_type: str = "simple"


class EdgePatch(BaseModel):
    label: str | None = None
    style: str | None = None
    edge_type: str | None = None


class EdgeResponse(BaseModel):
    id: str
    canvas_id: str
    source_id: str
    target_id: str
    label: str | None
    style: str
    edge_type: str = "simple"
