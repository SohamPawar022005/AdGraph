"""Shared enums and small types used across PermitGraph packages and apps.

Kept dependency-free (standard library only) so every package/app can depend on it
without pulling in FastAPI/SQLAlchemy/etc.
"""

from .enums import (
    DataTier,
    ExtractionMethod,
    RuleStatus,
    VerificationStatus,
    DependencyType,
    ChangeType,
    WorkflowState,
    SLAState,
    AuditEventType,
    Role,
)
from .reference_data import (
    ALL_INDUSTRIES,
    MAHARASHTRA_DISTRICTS,
    LAND_TYPES,
    PROJECT_STAGES,
)

__all__ = [
    "DataTier",
    "ExtractionMethod",
    "RuleStatus",
    "VerificationStatus",
    "DependencyType",
    "ChangeType",
    "WorkflowState",
    "SLAState",
    "AuditEventType",
    "Role",
    "ALL_INDUSTRIES",
    "MAHARASHTRA_DISTRICTS",
    "LAND_TYPES",
    "PROJECT_STAGES",
]
