import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_health_check_endpoint():
    """Verify health endpoint reports system status, uptime, and statutory engine."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "checks" in data
        assert data["checks"]["api"] == "ok"
        assert data["checks"]["statutory_engine"] == "ok"

@pytest.mark.asyncio
async def test_statutory_schedules_endpoint():
    """Verify available statutory remuneration schedules are exposed for advocates."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/remuneration/schedules")
        assert response.status_code == 200
        data = response.json()
        assert "schedules" in data
        assert len(data["schedules"]) >= 4

@pytest.mark.asyncio
async def test_feenotes_list_endpoint():
    """Verify fee notes / bills of costs can be retrieved and contain authoritative records."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/feenotes")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        first = data[0]
        assert "billNumber" in first
        assert "matterTitle" in first
        assert "grandTotal" in first

@pytest.mark.asyncio
async def test_statutory_calculation_endpoint():
    """Verify calculation engine responds via REST API with correct Schedule 6 math."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "schedule": "schedule_6_high_court",
            "claim_value": 30820193.28,
            "case_disposition": "full_trial"
        }
        response = await client.post("/api/v1/remuneration/calculate", json=payload)
        assert response.status_code == 200
        res = response.json()
        assert res["success"] is True
        assert res["data"]["instruction_fee"] == 662302.90
