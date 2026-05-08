import pytest


@pytest.fixture
async def canvas_id(client) -> str:
    res = await client.post("/api/v1/canvases", json={})
    return res.json()["id"]


@pytest.mark.asyncio
async def test_create_node(client, canvas_id):
    res = await client.post(
        f"/api/v1/canvases/{canvas_id}/nodes",
        json={"x": 100.0, "y": 200.0},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["x"] == 100.0
    assert data["y"] == 200.0
    assert data["content"] == ""
    assert data["width"] == 200.0
    assert data["height"] == 120.0
    assert data["color"] == "default"
    assert data["canvas_id"] == canvas_id
    assert "id" in data


@pytest.mark.asyncio
async def test_create_node_canvas_not_found(client):
    res = await client.post(
        "/api/v1/canvases/nonexistent/nodes",
        json={"x": 0.0, "y": 0.0},
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_update_node_content(client, canvas_id):
    create_res = await client.post(
        f"/api/v1/canvases/{canvas_id}/nodes", json={"x": 0.0, "y": 0.0}
    )
    node_id = create_res.json()["id"]

    patch_res = await client.patch(f"/api/v1/nodes/{node_id}", json={"content": "Hello world"})
    assert patch_res.status_code == 200
    assert patch_res.json()["content"] == "Hello world"


@pytest.mark.asyncio
async def test_update_node_position(client, canvas_id):
    create_res = await client.post(
        f"/api/v1/canvases/{canvas_id}/nodes", json={"x": 0.0, "y": 0.0}
    )
    node_id = create_res.json()["id"]

    patch_res = await client.patch(f"/api/v1/nodes/{node_id}", json={"x": 350.0, "y": 150.0})
    assert patch_res.status_code == 200
    assert patch_res.json()["x"] == 350.0
    assert patch_res.json()["y"] == 150.0


@pytest.mark.asyncio
async def test_delete_node(client, canvas_id):
    create_res = await client.post(
        f"/api/v1/canvases/{canvas_id}/nodes", json={"x": 0.0, "y": 0.0}
    )
    node_id = create_res.json()["id"]

    del_res = await client.delete(f"/api/v1/nodes/{node_id}")
    assert del_res.status_code == 204

    canvas_res = await client.get(f"/api/v1/canvases/{canvas_id}")
    node_ids = [n["id"] for n in canvas_res.json()["nodes"]]
    assert node_id not in node_ids


@pytest.mark.asyncio
async def test_batch_update_positions(client, canvas_id):
    n1 = (await client.post(f"/api/v1/canvases/{canvas_id}/nodes", json={"x": 0.0, "y": 0.0})).json()["id"]
    n2 = (await client.post(f"/api/v1/canvases/{canvas_id}/nodes", json={"x": 0.0, "y": 0.0})).json()["id"]

    res = await client.patch(
        f"/api/v1/canvases/{canvas_id}/nodes/batch",
        json={"updates": [{"id": n1, "x": 100.0, "y": 200.0}, {"id": n2, "x": 300.0, "y": 400.0}]},
    )
    assert res.status_code == 200
    assert res.json()["updated"] == 2

    canvas_data = (await client.get(f"/api/v1/canvases/{canvas_id}")).json()
    nodes_by_id = {n["id"]: n for n in canvas_data["nodes"]}
    assert nodes_by_id[n1]["x"] == 100.0
    assert nodes_by_id[n2]["x"] == 300.0
