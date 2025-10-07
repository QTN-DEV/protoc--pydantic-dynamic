from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.models.generation_graph_snapshot import GenerationGraphSnapshot
from src.models.graph import Graph
from src.models.published_graph import PublishedGraph
from src.models.pydantic_dynamic_class import PydanticDynamicClass
from src.utils.openai import generate

router = APIRouter()


class GraphStateRequest(BaseModel):
    name: Optional[str] = None
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    viewport: Optional[dict[str, Any]] = None
    system_prompt: Optional[str] = None


class GraphStateResponse(BaseModel):
    graph_id: str
    name: str
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    viewport: Optional[dict[str, Any]]
    system_prompt: str
    updated_at: datetime


class PublishResponse(BaseModel):
    graph_id: str
    version: int
    name: str
    published_at: datetime
    node_definitions_count: int
    message: str


class LatestVersionResponse(BaseModel):
    version: Optional[int]
    published_at: Optional[datetime]


class VersionHistoryItem(BaseModel):
    version: int
    name: str
    published_at: datetime
    is_active: bool


class GenerateRequest(BaseModel):
    prompt: str


class GenerateResponse(BaseModel):
    result: dict[str, Any]


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
            system_prompt="",
            updated_at=datetime.now(timezone.utc),
        )

    return GraphStateResponse(
        graph_id=graph.graph_id,
        name=graph.name,
        nodes=graph.nodes,
        edges=graph.edges,
        viewport=graph.viewport,
        system_prompt=graph.system_prompt,
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
        if state.system_prompt is not None:
            graph.system_prompt = state.system_prompt
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
            system_prompt=state.system_prompt or "",
        )
        await graph.insert()

    return GraphStateResponse(
        graph_id=graph.graph_id,
        name=graph.name,
        nodes=graph.nodes,
        edges=graph.edges,
        viewport=graph.viewport,
        system_prompt=graph.system_prompt,
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
async def publish_graph(graph_id: str, set_as_active: bool = False) -> PublishResponse:
    """Publish graph as a versioned snapshot"""
    # Get current graph state
    graph = await Graph.find_one(Graph.graph_id == graph_id)

    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found")

    # Fetch all related PydanticDynamicClass documents
    pydantic_classes = await PydanticDynamicClass.find(
        PydanticDynamicClass.graph_id == graph_id,
    ).to_list()

    # Convert PydanticDynamicClass documents to dicts
    node_definitions = [
        {
            "node_id": pdc.node_id,
            "graph_id": pdc.graph_id,
            "name": pdc.name,
            "nodes": pdc.nodes,
            "edges": pdc.edges,
            "created_at": pdc.created_at,
            "updated_at": pdc.updated_at,
        }
        for pdc in pydantic_classes
    ]

    # Find the latest published version for this graph_id
    latest_published = await PublishedGraph.find(
        PublishedGraph.graph_id == graph_id,
    ).sort(-PublishedGraph.version).first_or_none()

    # Determine next version number
    next_version = 1 if not latest_published else latest_published.version + 1

    # If setting as active, unset all other active versions for this graph
    if set_as_active:
        await PublishedGraph.find(
            PublishedGraph.graph_id == graph_id,
            PublishedGraph.is_active == True,
        ).update({"$set": {"is_active": False}})

    # Create new published snapshot
    published_graph = PublishedGraph(
        graph_id=graph.graph_id,
        version=next_version,
        name=graph.name,
        nodes=graph.nodes,
        edges=graph.edges,
        viewport=graph.viewport,
        node_definitions=node_definitions,
        is_active=set_as_active,
    )
    await published_graph.insert()

    return PublishResponse(
        graph_id=published_graph.graph_id,
        version=published_graph.version,
        name=published_graph.name,
        published_at=published_graph.published_at,
        node_definitions_count=len(node_definitions),
        message=(
            f"Graph published successfully as version {next_version} "
            f"with {len(node_definitions)} node definition(s)"
        ),
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
        system_prompt="",  # Published graphs don't store system_prompt
        updated_at=latest_published.published_at,
    )


@router.get("/graph/{graph_id}/latest-version", response_model=LatestVersionResponse)
async def get_latest_version(graph_id: str) -> LatestVersionResponse:
    """Get the latest published version number and date for a graph"""
    latest_published = await PublishedGraph.find(
        PublishedGraph.graph_id == graph_id,
    ).sort(-PublishedGraph.version).first_or_none()

    if not latest_published:
        return LatestVersionResponse(version=None, published_at=None)

    return LatestVersionResponse(
        version=latest_published.version,
        published_at=latest_published.published_at,
    )


@router.get("/graph/{graph_id}/versions", response_model=list[VersionHistoryItem])
async def get_version_history(
    graph_id: str, limit: int = 5,
) -> list[VersionHistoryItem]:
    """Get version history for a graph"""
    published_versions = (
        await PublishedGraph.find(PublishedGraph.graph_id == graph_id)
        .sort(-PublishedGraph.version)
        .limit(limit)
        .to_list()
    )

    return [
        VersionHistoryItem(
            version=pv.version,
            name=pv.name,
            published_at=pv.published_at,
            is_active=pv.is_active,
        )
        for pv in published_versions
    ]


@router.delete("/graph/{graph_id}/version/{version}")
async def delete_version(graph_id: str, version: int) -> dict[str, str | int]:
    """Delete a specific published version of a graph"""
    # Find the published version
    published_version = await PublishedGraph.find_one(
        PublishedGraph.graph_id == graph_id,
        PublishedGraph.version == version,
    )

    if not published_version:
        raise HTTPException(
            status_code=404,
            detail=f"Published version {version} not found for graph {graph_id}",
        )

    await published_version.delete()
    return {
        "message": f"Version {version} deleted successfully",
        "graph_id": graph_id,
        "version": version,
    }


@router.post("/graph/{graph_id}/version/{version}/set-active")
async def set_active_version(
    graph_id: str,
    version: int,
) -> dict[str, str | int | bool]:
    """Set a specific version as the active version"""
    # Find the version to set as active
    published_version = await PublishedGraph.find_one(
        PublishedGraph.graph_id == graph_id,
        PublishedGraph.version == version,
    )

    if not published_version:
        raise HTTPException(
            status_code=404,
            detail=f"Published version {version} not found for graph {graph_id}",
        )

    # Unset all other active versions for this graph
    await PublishedGraph.find(
        PublishedGraph.graph_id == graph_id,
        PublishedGraph.is_active == True,  # type: ignore  # noqa: E712
    ).update({"$set": {"is_active": False}})

    # Set this version as active
    published_version.is_active = True
    await published_version.save()

    return {
        "message": f"Version {version} set as active",
        "graph_id": graph_id,
        "version": version,
        "is_active": True,
    }


@router.post("/graph/{graph_id}/restore/{version}", response_model=GraphStateResponse)
async def restore_version(graph_id: str, version: int) -> GraphStateResponse:
    """Restore a graph to a specific published version"""
    # Find the published version
    published_version = await PublishedGraph.find_one(
        PublishedGraph.graph_id == graph_id,
        PublishedGraph.version == version,
    )

    if not published_version:
        raise HTTPException(
            status_code=404,
            detail=f"Published version {version} not found for graph {graph_id}",
        )

    # Find or create the current graph
    graph = await Graph.find_one(Graph.graph_id == graph_id)

    if graph:
        # Update existing graph with published version state
        graph.name = published_version.name
        graph.nodes = published_version.nodes
        graph.edges = published_version.edges
        graph.viewport = published_version.viewport
        graph.updated_at = datetime.now(timezone.utc)
        await graph.save()
    else:
        # Create new graph with published version state
        graph = Graph(
            graph_id=graph_id,
            name=published_version.name,
            nodes=published_version.nodes,
            edges=published_version.edges,
            viewport=published_version.viewport,
        )
        await graph.insert()

    # Restore node_definitions (PydanticDynamicClass documents)
    # First, delete all existing PydanticDynamicClass documents for this graph
    await PydanticDynamicClass.find(
        PydanticDynamicClass.graph_id == graph_id,
    ).delete()

    # Then, recreate them from the published node_definitions
    for node_def in published_version.node_definitions:
        pdc = PydanticDynamicClass(
            node_id=node_def["node_id"],
            graph_id=node_def["graph_id"],
            name=node_def["name"],
            nodes=node_def["nodes"],
            edges=node_def["edges"],
        )
        await pdc.insert()

    return GraphStateResponse(
        graph_id=graph.graph_id,
        name=graph.name,
        nodes=graph.nodes,
        edges=graph.edges,
        viewport=graph.viewport,
        system_prompt=graph.system_prompt,
        updated_at=graph.updated_at,
    )


@router.post("/graph/{graph_id}/generate", response_model=GenerateResponse)
async def generate_from_graph(
    graph_id: str,
    request: GenerateRequest,
) -> GenerateResponse:
    """Generate structured data from a graph using AI"""
    # Get the graph
    graph = await Graph.find_one(Graph.graph_id == graph_id)

    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found")

    # Get the Pydantic class from the graph
    pydantic_class = None
    pydantic_schema = None

    try:
        pydantic_class = await graph.get_pydantic_class()
        pydantic_schema = pydantic_class.model_json_schema()
    except Exception as e:
        # Save failed snapshot (schema generation failed)
        snapshot = GenerationGraphSnapshot(
            graph_id=graph.graph_id,
            name=graph.name,
            nodes=graph.nodes,
            edges=graph.edges,
            viewport=graph.viewport,
            system_prompt=graph.system_prompt,
            user_prompt=request.prompt,
            pydantic_model_schema={},
            generation_result=None,
            error_message=f"Failed to generate Pydantic class: {e!s}",
            success=False,
        )
        await snapshot.insert()

        raise HTTPException(
            status_code=400,
            detail=f"Failed to generate Pydantic class from graph: {e!s}",
        ) from e

    # Generate using OpenAI
    try:
        result = await generate(
            prompt=request.prompt,
            pydantic_model=pydantic_class,
            system_prompt=graph.system_prompt,
        )

        # Convert result to dict
        result_dict = result.model_dump()

        # Save successful generation snapshot
        snapshot = GenerationGraphSnapshot(
            graph_id=graph.graph_id,
            name=graph.name,
            nodes=graph.nodes,
            edges=graph.edges,
            viewport=graph.viewport,
            system_prompt=graph.system_prompt,
            user_prompt=request.prompt,
            pydantic_model_schema=pydantic_schema,
            generation_result=result_dict,
            error_message=None,
            success=True,
        )
        await snapshot.insert()

        return GenerateResponse(result=result_dict)
    except Exception as e:
        # Save failed snapshot (generation failed)
        snapshot = GenerationGraphSnapshot(
            graph_id=graph.graph_id,
            name=graph.name,
            nodes=graph.nodes,
            edges=graph.edges,
            viewport=graph.viewport,
            system_prompt=graph.system_prompt,
            user_prompt=request.prompt,
            pydantic_model_schema=pydantic_schema,
            generation_result=None,
            error_message=f"Failed to generate data: {e!s}",
            success=False,
        )
        await snapshot.insert()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate data: {e!s}",
        ) from e
