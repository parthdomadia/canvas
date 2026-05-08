import pytest


@pytest.mark.asyncio
async def test_create_canvas(client):
    response = await client.post("/api/v1/canvases", json={})
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Untitled Canvas"
    assert data["viewport"] == {"x": 0.0, "y": 0.0, "z": 1.0}
    assert data["nodes"] == []
    assert data["edges"] == []
    assert "id" in data


@pytest.mark.asyncio
async def test_create_canvas_custom_title(client):
    response = await client.post("/api/v1/canvases", json={"title": "My Map"})
    assert response.status_code == 201
    assert response.json()["title"] == "My Map"


@pytest.mark.asyncio
async def test_get_canvas(client):
    create_res = await client.post("/api/v1/canvases", json={})
    canvas_id = create_res.json()["id"]

    get_res = await client.get(f"/api/v1/canvases/{canvas_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == canvas_id


@pytest.mark.asyncio
async def test_get_canvas_not_found(client):
    response = await client.get("/api/v1/canvases/does-not-exist")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_canvas_title(client):
    create_res = await client.post("/api/v1/canvases", json={})
    canvas_id = create_res.json()["id"]

    patch_res = await client.patch(f"/api/v1/canvases/{canvas_id}", json={"title": "Updated"})
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Updated"


@pytest.mark.asyncio
async def test_update_canvas_viewport(client):
    create_res = await client.post("/api/v1/canvases", json={})
    canvas_id = create_res.json()["id"]

    patch_res = await client.patch(
        f"/api/v1/canvases/{canvas_id}",
        json={"viewport_x": -100.0, "viewport_y": -50.0, "viewport_z": 1.5},
    )
    assert patch_res.status_code == 200
    vp = patch_res.json()["viewport"]
    assert vp["x"] == -100.0
    assert vp["y"] == -50.0
    assert vp["z"] == 1.5
