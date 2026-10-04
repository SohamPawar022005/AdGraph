"""Session/config storage for the permitgraph CLI.

Stores the API base URL and bearer token at ~/.permitgraph/session.json. This is a
convenience file for a *local developer/operator* workflow -- it is not a credential
vault and should never be used to store production secrets.
"""
from __future__ import annotations

import json
import os
import pathlib
from dataclasses import asdict, dataclass
from typing import Optional

SESSION_DIR = pathlib.Path(os.environ.get("PERMITGRAPH_HOME", pathlib.Path.home() / ".permitgraph"))
SESSION_FILE = SESSION_DIR / "session.json"
DEFAULT_API_URL = os.environ.get("PERMITGRAPH_API_URL", "http://localhost:8000")


@dataclass
class Session:
    api_url: str = DEFAULT_API_URL
    token: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None

    def save(self) -> None:
        SESSION_DIR.mkdir(parents=True, exist_ok=True)
        SESSION_FILE.write_text(json.dumps(asdict(self), indent=2))
        try:
            SESSION_FILE.chmod(0o600)
        except OSError:
            pass

    @classmethod
    def load(cls) -> "Session":
        if not SESSION_FILE.exists():
            return cls()
        try:
            data = json.loads(SESSION_FILE.read_text())
        except json.JSONDecodeError:
            return cls()
        return cls(**{**asdict(cls()), **data})
