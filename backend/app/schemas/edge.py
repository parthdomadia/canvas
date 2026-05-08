from pydantic import BaseModel


class EdgeCreate(BaseModel):
    source_id: str
    target_id: str
    label: str | None = None
    style: str = "solid"


class EdgePatch(BaseModel):
    label: str | None = None
    style: str | None = None


class EdgeResponse(BaseModel):
    id: str
    canvas_id: str
    source_id: str
    target_id: str
    label: str | None
    style: str
