from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.models.pydantic_dynamic_class import PydanticDynamicClass

router = APIRouter()


class PCDStateRequest(BaseModel):
    graph_id: str
    name: str | None = None
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]


class PCDStateResponse(BaseModel):
    node_id: str
    graph_id: str
    name: str
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    updated_at: datetime


@router.get("/pcd/{node_id}", response_model=PCDStateResponse)
async def get_pcd(node_id: str) -> PCDStateResponse:
    """Load PCD state by node_id"""
    pcd = await PydanticDynamicClass.find_one(PydanticDynamicClass.node_id == node_id)

    if not pcd:
        raise HTTPException(status_code=404, detail="PCD not found")

    return PCDStateResponse(
        node_id=pcd.node_id,
        graph_id=pcd.graph_id,
        name=pcd.name,
        nodes=pcd.nodes,
        edges=pcd.edges,
        updated_at=pcd.updated_at,
    )


@router.post("/pcd/{node_id}", response_model=PCDStateResponse)
async def save_pcd(node_id: str, state: PCDStateRequest) -> PCDStateResponse:
    """Save or update PCD state (auto-save endpoint)"""
    pcd = await PydanticDynamicClass.find_one(PydanticDynamicClass.node_id == node_id)

    if pcd:
        # Update existing PCD
        if state.name is not None:
            pcd.name = state.name
        pcd.graph_id = state.graph_id
        pcd.nodes = state.nodes
        pcd.edges = state.edges
        pcd.updated_at = datetime.now(timezone.utc)
        await pcd.save()
    else:
        # Create new PCD
        pcd = PydanticDynamicClass(
            node_id=node_id,
            graph_id=state.graph_id,
            name=state.name or "Untitled PCD",
            nodes=state.nodes,
            edges=state.edges,
        )
        await pcd.insert()

    return PCDStateResponse(
        node_id=pcd.node_id,
        graph_id=pcd.graph_id,
        name=pcd.name,
        nodes=pcd.nodes,
        edges=pcd.edges,
        updated_at=pcd.updated_at,
    )


@router.delete("/pcd/{node_id}")
async def delete_pcd(node_id: str) -> dict[str, str]:
    """Delete a PCD by node_id"""
    pcd = await PydanticDynamicClass.find_one(PydanticDynamicClass.node_id == node_id)

    if not pcd:
        raise HTTPException(status_code=404, detail="PCD not found")

    await pcd.delete()
    return {"message": "PCD deleted successfully", "node_id": node_id}


@router.get("/pcd/by-graph/{graph_id}", response_model=list[PCDStateResponse])
async def get_pcds_by_graph(graph_id: str) -> list[PCDStateResponse]:
    """Get all PCDs for a specific graph (useful for joins)"""
    pcds = await PydanticDynamicClass.find(
        PydanticDynamicClass.graph_id == graph_id,
    ).to_list()

    return [
        PCDStateResponse(
            node_id=pcd.node_id,
            graph_id=pcd.graph_id,
            name=pcd.name,
            nodes=pcd.nodes,
            edges=pcd.edges,
            viewport=pcd.viewport,
            updated_at=pcd.updated_at,
        )
        for pcd in pcds
    ]
