from pydantic import BaseModel

from .edge import EdgeResponse
from .node import NodeResponse


class CanvasCreate(BaseModel):
    title: str = "Untitled Canvas"


class CanvasPatch(BaseModel):
    title: str | None = None
    viewport_x: float | None = None
    viewport_y: float | None = None
    viewport_z: float | None = None


class ViewportData(BaseModel):
    x: float
    y: float
    z: float


class CanvasFullResponse(BaseModel):
    id: str
    title: str
    viewport: ViewportData
    nodes: list[NodeResponse]
    edges: list[EdgeResponse]


class CanvasMetaResponse(BaseModel):
    id: str
    title: str
    viewport: ViewportData
