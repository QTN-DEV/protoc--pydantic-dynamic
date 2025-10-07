from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.models.graph import Graph
from src.models.published_graph import PublishedGraph

router = APIRouter()


class GraphStateRequest(BaseModel):
    name: str | None = None
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    viewport: dict[str, Any] | None = None


class GraphStateResponse(BaseModel):
    graph_id: str
    name: str
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    viewport: dict[str, Any] | None
    updated_at: datetime


class PublishResponse(BaseModel):
    graph_id: str
    version: int
    name: str
    published_at: datetime
    message: str


@router.get("/graph/{graph_id}", response_model=GraphStateResponse)
async def get_graph(graph_id: str) -> GraphStateResponse:
    """Load graph state by graph_id"""
    graph = await Graph.find_one(Graph.graph_id == graph_id)

    if not graph:
        # Return empty state for new graphs
        return GraphStateResponse(
            graph_id=graph_id,
            name="Untitled Graph",
            nodes=[],
            edges=[],
            viewport=None,
            updated_at=datetime.now(timezone.utc),
        )

    return GraphStateResponse(
        graph_id=graph.graph_id,
        name=graph.name,
        nodes=graph.nodes,
        edges=graph.edges,
        viewport=graph.viewport,
        updated_at=graph.updated_at,
    )


@router.post("/graph/{graph_id}", response_model=GraphStateResponse)
async def save_graph(graph_id: str, state: GraphStateRequest) -> GraphStateResponse:
    """Save or update graph state"""
    graph = await Graph.find_one(Graph.graph_id == graph_id)

    if graph:
        # Update existing graph
        if state.name is not None:
            graph.name = state.name
        graph.nodes = state.nodes
        graph.edges = state.edges
        graph.viewport = state.viewport
        graph.updated_at = datetime.now(timezone.utc)
        await graph.save()
    else:
        # Create new graph
        graph = Graph(
            graph_id=graph_id,
            name=state.name or "Untitled Graph",
            nodes=state.nodes,
            edges=state.edges,
            viewport=state.viewport,
        )
        await graph.insert()

    return GraphStateResponse(
        graph_id=graph.graph_id,
        name=graph.name,
        nodes=graph.nodes,
        edges=graph.edges,
        viewport=graph.viewport,
        updated_at=graph.updated_at,
    )


@router.delete("/graph/{graph_id}")
async def delete_graph(graph_id: str) -> dict[str, str | int]:
    """Delete a graph by graph_id"""
    graph = await Graph.find_one(Graph.graph_id == graph_id)

    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found")

    await graph.delete()
    return {"message": "Graph deleted successfully", "graph_id": graph_id}


@router.post("/graph/{graph_id}/publish", response_model=PublishResponse)
async def publish_graph(graph_id: str) -> PublishResponse:
    """Publish graph as a versioned snapshot"""
    # Get current graph state
    graph = await Graph.find_one(Graph.graph_id == graph_id)

    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found")

    # Find the latest published version for this graph_id
    latest_published = await PublishedGraph.find(
        PublishedGraph.graph_id == graph_id,
    ).sort(-PublishedGraph.version).first_or_none()

    # Determine next version number
    next_version = 1 if not latest_published else latest_published.version + 1

    # Create new published snapshot
    published_graph = PublishedGraph(
        graph_id=graph.graph_id,
        version=next_version,
        name=graph.name,
        nodes=graph.nodes,
        edges=graph.edges,
        viewport=graph.viewport,
    )
    await published_graph.insert()

    return PublishResponse(
        graph_id=published_graph.graph_id,
        version=published_graph.version,
        name=published_graph.name,
        published_at=published_graph.published_at,
        message=f"Graph published successfully as version {next_version}",
    )


@router.get("/graph/{graph_id}/published/latest", response_model=GraphStateResponse)
async def get_latest_published_graph(graph_id: str) -> GraphStateResponse:
    """Get the latest published version of a graph"""
    latest_published = await PublishedGraph.find(
        PublishedGraph.graph_id == graph_id,
    ).sort(-PublishedGraph.version).first_or_none()

    if not latest_published:
        raise HTTPException(status_code=404, detail="No published version found")

    return GraphStateResponse(
        graph_id=latest_published.graph_id,
        name=latest_published.name,
        nodes=latest_published.nodes,
        edges=latest_published.edges,
        viewport=latest_published.viewport,
        updated_at=latest_published.published_at,
    )
