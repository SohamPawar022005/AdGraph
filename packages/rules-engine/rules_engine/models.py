"""Pydantic models for the PermitGraph rules-as-code format.

See docs/regulatory/rules-as-code-format.md for the full human-readable spec and
data/real/rules/*.yaml + data/candidate/rules/*.yaml for real examples derived from
the MAITRI Act 2023, the Maharashtra Industrial Development Act 1961 and the
Maharashtra (formerly Bombay) Khadi and Village Industries Act 1960.
"""

from __future__ import annotations

from datetime import date
from typing import Any, List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Condition(BaseModel):
    """A single logical condition node.

    Exactly one of `all`, `any`, `not_`, or the leaf triple (field/operator/value)
    must be set. Leaf conditions with operator `exists`/`not_exists` ignore `value`.
    """

    model_config = ConfigDict(populate_by_name=True)

    all: Optional[List["Condition"]] = None
    any: Optional[List["Condition"]] = None
    not_: Optional["Condition"] = Field(default=None, alias="not")

    field: Optional[str] = None
    operator: Optional[str] = None
    value: Optional[Any] = None

    @model_validator(mode="after")
    def _exactly_one_shape(self) -> "Condition":
        shapes = [
            self.all is not None,
            self.any is not None,
            self.not_ is not None,
            self.field is not None,
        ]
        if sum(shapes) != 1:
            raise ValueError(
                "Condition must set exactly one of: all, any, not, or field/operator/value"
            )
        if self.field is not None and self.operator is None:
            raise ValueError("Leaf condition requires an 'operator'")
        return self


Condition.model_rebuild()


class RuleSource(BaseModel):
    document: str
    document_version: Optional[str] = None
    section: Optional[str] = None
    page: Optional[str] = None
    url: Optional[str] = None


class RuleEffective(BaseModel):
    from_: date = Field(alias="from")
    to: Optional[date] = None

    model_config = ConfigDict(populate_by_name=True)


class Requirement(BaseModel):
    approval: str
    documents: List[str] = Field(default_factory=list)
    reason: Optional[str] = None


class Action(BaseModel):
    type: str
    metadata: dict = Field(default_factory=dict)


class Rule(BaseModel):
    id: str
    name: str
    jurisdiction: str
    version: str = "v1"
    supersedes: Optional[str] = None
    source: RuleSource
    effective: RuleEffective
    status: str = "candidate"  # candidate | verified | deprecated | superseded | rejected
    applies_when: Condition
    requires: List[Requirement] = Field(default_factory=list)
    actions: List[Action] = Field(default_factory=list)
    confidence: float = 1.0
    notes: str = ""
    tags: List[str] = Field(default_factory=list)
