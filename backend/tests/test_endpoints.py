"""Endpoint CRUD, project scoping, and validation."""

from httpx import AsyncClient


async def _make_endpoint(client: AsyncClient, project_id: str, **overrides) -> dict:
    payload = {
        "method": "POST",
        "path": "/orders",
        "target_url": "https://api.example.com/orders",
        "description": "Create a new order",
    } | overrides
    response = await client.post(f"/api/projects/{project_id}/endpoints", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


async def test_create_endpoint(client: AsyncClient, project: dict) -> None:
    endpoint = await _make_endpoint(client, project["id"])
    assert endpoint["method"] == "POST"
    assert endpoint["path"] == "/orders"
    assert endpoint["enabled"] is True
    assert endpoint["project_id"] == project["id"]


async def test_path_gets_a_leading_slash(client: AsyncClient, project: dict) -> None:
    endpoint = await _make_endpoint(client, project["id"], path="products")
    assert endpoint["path"] == "/products"


async def test_duplicate_method_and_path_conflicts(
    client: AsyncClient, project: dict
) -> None:
    await _make_endpoint(client, project["id"])
    duplicate = await client.post(
        f"/api/projects/{project['id']}/endpoints",
        json={
            "method": "POST",
            "path": "/orders",
            "target_url": "https://api.example.com/orders",
        },
    )
    assert duplicate.status_code == 409


async def test_same_path_with_a_different_method_is_allowed(
    client: AsyncClient, project: dict
) -> None:
    await _make_endpoint(client, project["id"], method="POST")
    other = await _make_endpoint(client, project["id"], method="GET")
    assert other["method"] == "GET"


async def test_endpoints_are_scoped_to_their_project(client: AsyncClient) -> None:
    """An endpoint id from project A must not be readable through project B."""
    a = (await client.post("/api/projects", json={"name": "A"})).json()
    b = (await client.post("/api/projects", json={"name": "B"})).json()
    endpoint = await _make_endpoint(client, a["id"])

    leaked = await client.get(f"/api/projects/{b['id']}/endpoints/{endpoint['id']}")
    assert leaked.status_code == 404
    assert leaked.json() == {"detail": "Endpoint not found"}

    assert (await client.get(f"/api/projects/{b['id']}/endpoints")).json() == []


async def test_toggle_enabled(client: AsyncClient, project: dict) -> None:
    endpoint = await _make_endpoint(client, project["id"])
    response = await client.patch(
        f"/api/projects/{project['id']}/endpoints/{endpoint['id']}/enabled",
        json={"enabled": False},
    )
    assert response.status_code == 200
    assert response.json()["enabled"] is False

    only_enabled = await client.get(
        f"/api/projects/{project['id']}/endpoints", params={"enabled_only": True}
    )
    assert only_enabled.json() == []


async def test_endpoint_detail_includes_zeroed_stats(
    client: AsyncClient, project: dict
) -> None:
    endpoint = await _make_endpoint(client, project["id"])
    response = await client.get(
        f"/api/projects/{project['id']}/endpoints/{endpoint['id']}"
    )
    assert response.status_code == 200
    stats = response.json()["stats"]
    assert stats["total_requests"] == 0
    assert stats["success_rate"] == 0.0


async def test_target_url_must_be_http(client: AsyncClient, project: dict) -> None:
    response = await client.post(
        f"/api/projects/{project['id']}/endpoints",
        json={"method": "GET", "path": "/x", "target_url": "ftp://files.example.com"},
    )
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "target_url"


async def test_delete_endpoint(client: AsyncClient, project: dict) -> None:
    endpoint = await _make_endpoint(client, project["id"])
    deleted = await client.delete(
        f"/api/projects/{project['id']}/endpoints/{endpoint['id']}"
    )
    assert deleted.status_code == 204
    assert (
        await client.get(f"/api/projects/{project['id']}/endpoints/{endpoint['id']}")
    ).status_code == 404
