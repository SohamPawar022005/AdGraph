from datetime import date

import pytest
from rules_engine import Rule, evaluate, evaluate_all
from rules_engine.engine import Verdict


def make_rule(**overrides):
    base = dict(
        id="RULE-TEST-001",
        name="Test rule: Single Window filing applies in Maharashtra",
        jurisdiction="Maharashtra",
        source={"document": "maitri-act-2023", "section": "Section 3"},
        effective={"from": "2023-07-03"},
        status="verified",
        applies_when={
            "all": [
                {"field": "jurisdiction", "operator": "equals", "value": "Maharashtra"},
                {"field": "project_stage", "operator": "in", "value": ["new", "expansion"]},
            ]
        },
        requires=[{"approval": "single-window-application", "documents": ["processing_fee_receipt"]}],
    )
    base.update(overrides)
    return Rule.model_validate(base)


def test_rule_matches_when_all_conditions_true():
    rule = make_rule()
    result = evaluate(rule, {"jurisdiction": "Maharashtra", "project_stage": "new"})
    assert result.verdict == Verdict.TRUE
    assert "single-window-application" in result.required_approvals
    assert "processing_fee_receipt" in result.required_documents


def test_rule_false_when_condition_fails():
    rule = make_rule()
    result = evaluate(rule, {"jurisdiction": "Maharashtra", "project_stage": "operational"})
    assert result.verdict == Verdict.FALSE
    assert result.required_approvals == []


def test_rule_unknown_when_field_missing():
    rule = make_rule()
    result = evaluate(rule, {"jurisdiction": "Maharashtra"})
    assert result.verdict == Verdict.UNKNOWN
    assert result.error == "INSUFFICIENT_INPUT"


def test_rule_not_effective_before_start_date():
    rule = make_rule()
    result = evaluate(
        rule, {"jurisdiction": "Maharashtra", "project_stage": "new"}, as_of=date(2022, 1, 1)
    )
    assert result.verdict == Verdict.FALSE
    assert "not effective" in result.reasons[0]


def test_rule_not_effective_after_end_date():
    rule = make_rule(effective={"from": "2020-01-01", "to": "2021-01-01"})
    result = evaluate(
        rule, {"jurisdiction": "Maharashtra", "project_stage": "new"}, as_of=date(2026, 1, 1)
    )
    assert result.verdict == Verdict.FALSE


def test_deprecated_rule_never_matches():
    rule = make_rule(status="deprecated")
    result = evaluate(rule, {"jurisdiction": "Maharashtra", "project_stage": "new"})
    assert result.verdict == Verdict.FALSE


def test_rejected_rule_returns_rule_unverified_error():
    rule = make_rule(status="rejected")
    result = evaluate(rule, {"jurisdiction": "Maharashtra", "project_stage": "new"})
    assert result.error == "RULE_UNVERIFIED"


def test_not_operator_inverts():
    rule = make_rule(
        applies_when={
            "not": {"field": "hazardous_material", "operator": "equals", "value": True}
        }
    )
    result = evaluate(rule, {"hazardous_material": False})
    assert result.verdict == Verdict.TRUE
    result2 = evaluate(rule, {"hazardous_material": True})
    assert result2.verdict == Verdict.FALSE


def test_any_operator_short_circuits_true():
    rule = make_rule(
        applies_when={
            "any": [
                {"field": "industry", "operator": "equals", "value": "food_processing"},
                {"field": "industry", "operator": "equals", "value": "textile"},
            ]
        }
    )
    result = evaluate(rule, {"industry": "textile"})
    assert result.verdict == Verdict.TRUE


def test_numeric_threshold_operators():
    rule = make_rule(
        applies_when={"field": "employees", "operator": "gte", "value": 50}
    )
    assert evaluate(rule, {"employees": 80}).verdict == Verdict.TRUE
    assert evaluate(rule, {"employees": 10}).verdict == Verdict.FALSE


def test_evaluate_all_returns_one_result_per_rule():
    rules = [make_rule(id="R1"), make_rule(id="R2")]
    results = evaluate_all(rules, {"jurisdiction": "Maharashtra", "project_stage": "new"})
    assert {r.rule_id for r in results} == {"R1", "R2"}


def test_invalid_condition_shape_rejected():
    with pytest.raises(ValueError):
        Rule.model_validate(
            {
                "id": "BAD",
                "name": "bad",
                "jurisdiction": "Maharashtra",
                "source": {"document": "x"},
                "effective": {"from": "2023-01-01"},
                "applies_when": {"field": "a", "operator": "equals", "value": 1, "all": []},
            }
        )
