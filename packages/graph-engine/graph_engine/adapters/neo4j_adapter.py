"""Optional Neo4j adapter interface (NOT implemented in this release).

Per docs/research/technical-landscape.md, the approval/knowledge graph is small
enough that PostgreSQL + in-memory networkx traversal (graph_engine.graph.ApprovalGraph)
is sufficient for this release. This module documents the interface a future Neo4j
adapter would implement, so graph_engine callers can be written against an abstract
port rather than assuming Postgres forever.

Do NOT import `neo4j` here unconditionally -- it is an optional dependency, not
installed by default. Attempting to use this adapter without `pip install neo4j`
and a running Neo4j instance will raise `NotImplementedError`.
"""

from __future__ import annotations

from typing import List, Optional

from ..graph import ApprovalGraph, GraphEdge, GraphNode


class Neo4jGraphAdapter:
    """Sketch of the adapter surface a Neo4j-backed implementation would provide.

    Every method mirrors a method on `graph_engine.graph.ApprovalGraph` so the rest
    of the codebase (API services, impact-analysis) could depend on this interface
    instead of the concrete in-memory class, without any other code changes, if/when
    the graph outgrows a single-process relational representation.
    """

    def __init__(self, uri: str, user: str, password: str):
        raise NotImplementedError(
            "Neo4jGraphAdapter is a documented interface stub, not implemented in this "
            "release. See docs/research/technical-landscape.md for the justification. "
            "Use graph_engine.graph.ApprovalGraph instead."
        )

    def add_node(self, node: GraphNode) -> None:  # pragma: no cover - interface stub
        raise NotImplementedError

    def add_edge(self, edge: GraphEdge) -> None:  # pragma: no cover - interface stub
        raise NotImplementedError

    def upstream(self, node_id: str, max_depth: Optional[int] = None) -> List[str]:  # pragma: no cover
        raise NotImplementedError

    def downstream(self, node_id: str, max_depth: Optional[int] = None) -> List[str]:  # pragma: no cover
        raise NotImplementedError

    def export_to_in_memory(self) -> ApprovalGraph:  # pragma: no cover - interface stub
        raise NotImplementedError
