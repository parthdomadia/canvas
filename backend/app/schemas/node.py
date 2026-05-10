from pydantic import BaseModel


class NodeCreate(BaseModel):
    x: float
    y: float
    content: str = ""
    width: float = 200.0
    height: float = 120.0
    color: str = "default"
    font_size: int = 13


class NodePatch(BaseModel):
    content: str | None = None
    x: float | None = None
    y: float | None = None
    width: float | None = None
    height: float | None = None
    color: str | None = None
    z_index: int | None = None
    font_size: int | None = None


class NodePositionUpdate(BaseModel):
    id: str
    x: float
    y: float


class BatchPositionUpdate(BaseModel):
    updates: list[NodePositionUpdate]


class NodeResponse(BaseModel):
    id: str
    canvas_id: str
    content: str
    x: float
    y: float
    width: float
    height: float
    color: str
    z_index: int
    font_size: int
