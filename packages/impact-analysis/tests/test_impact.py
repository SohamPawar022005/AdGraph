from graph_engine import ApprovalGraph, GraphEdge, GraphNode
from impact_analysis import analyze_impact


def build_graph():
    nodes = [GraphNode(id=i, label=i) for i in ["consent-to-establish", "consent-to-operate", "factory-license"]]
    edges = [
        GraphEdge(source_id="consent-to-operate", target_id="consent-to-establish", relation="requires"),
        GraphEdge(source_id="factory-license", target_id="consent-to-establish", relation="requires"),
    ]
    return ApprovalGraph.from_edges(nodes, edges)


def test_impact_traverses_downstream_and_scores():
    graph = build_graph()
    report = analyze_impact(
        changed_rule_ids=["RULE-1"],
        rule_to_approvals={"RULE-1": ["consent-to-establish"]},
        approval_graph=graph,
        approval_to_business_types={
            "consent-to-establish": ["food_processing"],
            "consent-to-operate": ["food_processing"],
            "factory-license": ["textile"],
        },
        active_applications=[
            {"id": "APP-1", "approval_ids": ["consent-to-operate"]},
            {"id": "APP-2", "approval_ids": ["factory-license"]},
            {"id": "APP-3", "approval_ids": ["unrelated-approval"]},
        ],
    )
    assert report.directly_affected_approvals == ["consent-to-establish"]
    assert set(report.downstream_affected_approvals) == {"consent-to-operate", "factory-license"}
    assert set(report.affected_business_types) == {"food_processing", "textile"}
    assert set(report.affected_application_ids) == {"APP-1", "APP-2"}
    assert 0 < report.impact_score <= 1
    assert "structural traversal" in report.disclaimer


def test_no_impact_when_rule_maps_to_nothing():
    graph = build_graph()
    report = analyze_impact(
        changed_rule_ids=["RULE-UNRELATED"],
        rule_to_approvals={},
        approval_graph=graph,
        approval_to_business_types={},
    )
    assert report.impact_score == 0
    assert report.directly_affected_approvals == []
