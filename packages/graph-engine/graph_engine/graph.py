"""Approval dependency graph + regulatory knowledge graph, backed by networkx.

Design decision (docs/research/technical-landscape.md): the graph is represented as
relational rows in PostgreSQL by the API layer; this module provides the in-memory
traversal algorithms (cycle detection, upstream/downstream closure, shortest path)
over whatever edge list the caller provides, so it works identically whether the data
came from the database, a synthetic fixture, or a unit test.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Optional

import networkx as nx


@dataclass
class GraphNode:
    id: str
    label: str
    kind: str = "approval"  # approval | authority | document | regulation | rule
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GraphEdge:
    source_id: str
    target_id: str
    relation: str = "depends_on"  # requires | depends_on | produces | informs
    confidence: float = 1.0
    is_synthetic: bool = False
    provenance: Optional[str] = None


class CycleDetectedError(Exception):
    def __init__(self, cycle: List[str]):
        self.cycle = cycle
        super().__init__(f"Cycle detected in approval dependency graph: {' -> '.join(cycle)}")


class ApprovalGraph:
    """A directed graph of approvals (and optionally authorities/documents).

    Edge direction convention: edge (A -> B) means "A depends on / requires B",
    i.e. B must typically be satisfied before/alongside A. `downstream(B)` therefore
    returns things that depend on B (B's consumers); `upstream(A)` returns A's
    prerequisites.
    """

    def __init__(self) -> None:
        self._g = nx.DiGraph()

    # -- construction -----------------------------------------------------
    def add_node(self, node: GraphNode) -> None:
        self._g.add_node(node.id, label=node.label, kind=node.kind, **node.metadata)

    def add_edge(self, edge: GraphEdge) -> None:
        self._g.add_edge(
            edge.source_id,
            edge.target_id,
            relation=edge.relation,
            confidence=edge.confidence,
            is_synthetic=edge.is_synthetic,
            provenance=edge.provenance,
        )

    @classmethod
    def from_edges(cls, nodes: Iterable[GraphNode], edges: Iterable[GraphEdge]) -> "ApprovalGraph":
        graph = cls()
        for n in nodes:
            graph.add_node(n)
        for e in edges:
            graph.add_edge(e)
        return graph

    # -- queries ------------------------------------------------------------
    def has_cycle(self) -> bool:
        return not nx.is_directed_acyclic_graph(self._g)

    def find_cycles(self) -> List[List[str]]:
        return list(nx.simple_cycles(self._g))

    def upstream(self, node_id: str, max_depth: Optional[int] = None) -> List[str]:
        """Prerequisites of `node_id` (nodes it depends on), transitively."""
        if node_id not in self._g:
            return []
        if max_depth is None:
            return [n for n in nx.descendants(self._g, node_id)]
        lengths = nx.single_source_shortest_path_length(self._g, node_id, cutoff=max_depth)
        return [n for n in lengths if n != node_id]

    def downstream(self, node_id: str, max_depth: Optional[int] = None) -> List[str]:
        """Nodes that depend on `node_id`, transitively (reverse direction)."""
        if node_id not in self._g:
            return []
        rev = self._g.reverse(copy=False)
        if max_depth is None:
            return [n for n in nx.descendants(rev, node_id)]
        lengths = nx.single_source_shortest_path_length(rev, node_id, cutoff=max_depth)
        return [n for n in lengths if n != node_id]

    def shortest_path(self, source_id: str, target_id: str) -> Optional[List[str]]:
        try:
            return nx.shortest_path(self._g, source_id, target_id)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return None

    def topological_order(self) -> List[str]:
        if self.has_cycle():
            raise CycleDetectedError(self.find_cycles()[0])
        return list(nx.topological_sort(self._g))

    def nodes(self) -> List[GraphNode]:
        return [
            GraphNode(
                id=n,
                label=data.get("label", n),
                kind=data.get("kind", "approval"),
                metadata={k: v for k, v in data.items() if k not in {"label", "kind"}},
            )
            for n, data in self._g.nodes(data=True)
        ]

    def edges(self) -> List[GraphEdge]:
        return [
            GraphEdge(
                source_id=u,
                target_id=v,
                relation=data.get("relation", "depends_on"),
                confidence=data.get("confidence", 1.0),
                is_synthetic=data.get("is_synthetic", False),
                provenance=data.get("provenance"),
            )
            for u, v, data in self._g.edges(data=True)
        ]

    def node_count(self) -> int:
        return self._g.number_of_nodes()

    def edge_count(self) -> int:
        return self._g.number_of_edges()

    def to_dict(self) -> Dict[str, Any]:
        """A JSON-serialisable representation suitable for the frontend graph view."""
        return {
            "nodes": [
                {"id": n.id, "label": n.label, "kind": n.kind, **n.metadata} for n in self.nodes()
            ],
            "edges": [
                {
                    "source": e.source_id,
                    "target": e.target_id,
                    "relation": e.relation,
                    "confidence": e.confidence,
                    "is_synthetic": e.is_synthetic,
                    "provenance": e.provenance,
                }
                for e in self.edges()
            ],
            "has_cycle": self.has_cycle(),
        }
