"""Project CRUD and isolation between projects."""

from httpx import AsyncClient


async def test_create_and_read_project(client: AsyncClient) -> None:
    created = await client.post(
        "/api/projects",
        json={"name": "Shop", "environment": "staging", "base_url": "https://a.example.com"},
    )
    assert created.status_code == 201
    body = created.json()
    assert body["name"] == "Shop"
    assert body["environment"] == "staging"
    assert body["created_at"] and body["updated_at"]

    fetched = await client.get(f"/api/projects/{body['id']}")
    assert fetched.status_code == 200
    assert fetched.json()["id"] == body["id"]


async def test_list_projects_includes_counts(client: AsyncClient, project: dict) -> None:
    response = await client.get("/api/projects")
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) == 1
    assert rows[0]["endpoint_count"] == 0
    assert rows[0]["request_count"] == 0


async def test_update_project_leaves_omitted_fields_alone(
    client: AsyncClient, project: dict
) -> None:
    response = await client.put(
        f"/api/projects/{project['id']}", json={"description": "Updated"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["description"] == "Updated"
    assert body["name"] == project["name"]          # untouched
    assert body["environment"] == project["environment"]


async def test_duplicate_project_name_is_a_conflict(
    client: AsyncClient, project: dict
) -> None:
    response = await client.post("/api/projects", json={"name": project["name"]})
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


async def test_missing_project_returns_a_clean_404(client: AsyncClient) -> None:
    response = await client.get("/api/projects/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 404
    assert response.json() == {"detail": "Project not found"}


async def test_invalid_base_url_is_rejected(client: AsyncClient) -> None:
    response = await client.post(
        "/api/projects", json={"name": "Bad", "base_url": "not-a-url"}
    )
    assert response.status_code == 422
    body = response.json()
    assert "Validation failed" in body["detail"]
    assert body["errors"][0]["field"] == "base_url"


async def test_delete_project_cascades(client: AsyncClient, project: dict) -> None:
    await client.post(
        f"/api/projects/{project['id']}/endpoints",
        json={"method": "GET", "path": "/products", "target_url": "https://a.example.com/products"},
    )
    deleted = await client.delete(f"/api/projects/{project['id']}")
    assert deleted.status_code == 204

    assert (await client.get(f"/api/projects/{project['id']}")).status_code == 404
    listed = await client.get(f"/api/projects/{project['id']}/endpoints")
    assert listed.status_code == 404
