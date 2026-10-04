import pytest
from graph_engine import ApprovalGraph, GraphEdge, GraphNode


def linear_graph():
    nodes = [GraphNode(id=i, label=i) for i in ["A", "B", "C", "D"]]
    edges = [
        GraphEdge(source_id="A", target_id="B"),
        GraphEdge(source_id="B", target_id="C"),
        GraphEdge(source_id="C", target_id="D"),
    ]
    return ApprovalGraph.from_edges(nodes, edges)


def test_upstream_and_downstream_linear():
    g = linear_graph()
    assert set(g.upstream("A")) == {"B", "C", "D"}
    assert set(g.downstream("D")) == {"A", "B", "C"}
    assert g.upstream("D") == []


def test_no_cycle_in_linear_graph():
    g = linear_graph()
    assert g.has_cycle() is False
    assert g.topological_order()[0] == "A"


def test_cycle_detection():
    nodes = [GraphNode(id=i, label=i) for i in ["X", "Y", "Z"]]
    edges = [
        GraphEdge(source_id="X", target_id="Y"),
        GraphEdge(source_id="Y", target_id="Z"),
        GraphEdge(source_id="Z", target_id="X"),
    ]
    g = ApprovalGraph.from_edges(nodes, edges)
    assert g.has_cycle() is True
    assert len(g.find_cycles()) >= 1


def test_branching_and_merging():
    nodes = [GraphNode(id=i, label=i) for i in ["Root", "Left", "Right", "Merge"]]
    edges = [
        GraphEdge(source_id="Root", target_id="Left"),
        GraphEdge(source_id="Root", target_id="Right"),
        GraphEdge(source_id="Left", target_id="Merge"),
        GraphEdge(source_id="Right", target_id="Merge"),
    ]
    g = ApprovalGraph.from_edges(nodes, edges)
    assert set(g.upstream("Root")) == {"Left", "Right", "Merge"}
    assert set(g.downstream("Merge")) == {"Root", "Left", "Right"}


def test_shortest_path():
    g = linear_graph()
    assert g.shortest_path("A", "D") == ["A", "B", "C", "D"]
    assert g.shortest_path("D", "A") is None


def test_disconnected_graph():
    nodes = [GraphNode(id=i, label=i) for i in ["A", "B", "C"]]
    edges = [GraphEdge(source_id="A", target_id="B")]
    g = ApprovalGraph.from_edges(nodes, edges)
    assert g.upstream("C") == []
    assert g.downstream("C") == []
    assert g.node_count() == 3


def test_to_dict_serialisable():
    g = linear_graph()
    d = g.to_dict()
    assert len(d["nodes"]) == 4
    assert len(d["edges"]) == 3
    assert d["has_cycle"] is False
