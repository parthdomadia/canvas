import pytest


@pytest.fixture
async def canvas_id(client) -> str:
    res = await client.post("/api/v1/canvases", json={})
    return res.json()["id"]


@pytest.fixture
async def two_nodes(client, canvas_id):
    n1 = (await client.post(f"/api/v1/canvases/{canvas_id}/nodes", json={"x": 0.0, "y": 0.0})).json()["id"]
    n2 = (await client.post(f"/api/v1/canvases/{canvas_id}/nodes", json={"x": 200.0, "y": 0.0})).json()["id"]
    return canvas_id, n1, n2


@pytest.mark.asyncio
async def test_create_edge(client, two_nodes):
    canvas_id, n1, n2 = two_nodes
    res = await client.post(
        f"/api/v1/canvases/{canvas_id}/edges",
        json={"source_id": n1, "target_id": n2},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["source_id"] == n1
    assert data["target_id"] == n2
    assert data["canvas_id"] == canvas_id
    assert data["style"] == "solid"
    assert data["label"] is None
    assert "id" in data


@pytest.mark.asyncio
async def test_create_edge_self_loop_rejected(client, two_nodes):
    canvas_id, n1, _ = two_nodes
    res = await client.post(
        f"/api/v1/canvases/{canvas_id}/edges",
        json={"source_id": n1, "target_id": n1},
    )
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_create_edge_canvas_not_found(client, two_nodes):
    _, n1, n2 = two_nodes
    res = await client.post(
        "/api/v1/canvases/nonexistent/edges",
        json={"source_id": n1, "target_id": n2},
    )
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_delete_edge(client, two_nodes):
    canvas_id, n1, n2 = two_nodes
    create_res = await client.post(
        f"/api/v1/canvases/{canvas_id}/edges",
        json={"source_id": n1, "target_id": n2},
    )
    edge_id = create_res.json()["id"]

    del_res = await client.delete(f"/api/v1/edges/{edge_id}")
    assert del_res.status_code == 204

    canvas_res = await client.get(f"/api/v1/canvases/{canvas_id}")
    edge_ids = [e["id"] for e in canvas_res.json()["edges"]]
    assert edge_id not in edge_ids


@pytest.mark.asyncio
async def test_delete_node_cascades_edges(client, two_nodes):
    canvas_id, n1, n2 = two_nodes
    create_res = await client.post(
        f"/api/v1/canvases/{canvas_id}/edges",
        json={"source_id": n1, "target_id": n2},
    )
    edge_id = create_res.json()["id"]

    # Delete the source node — edge should cascade-delete via DB constraint
    await client.delete(f"/api/v1/nodes/{n1}")

    canvas_res = await client.get(f"/api/v1/canvases/{canvas_id}")
    edge_ids = [e["id"] for e in canvas_res.json()["edges"]]
    assert edge_id not in edge_ids
