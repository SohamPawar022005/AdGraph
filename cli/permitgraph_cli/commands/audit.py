from __future__ import annotations

import json as _json
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from ..client import get_client

app = typer.Typer(no_args_is_help=True)
console = Console()


@app.command("list")
def list_events(
    entity_type: Optional[str] = typer.Option(None),
    entity_id: Optional[str] = typer.Option(None),
    limit: int = 50,
    json_out: bool = typer.Option(False, "--json"),
):
    """List audit events, optionally filtered."""
    params = {"limit": limit}
    if entity_type:
        params["entity_type"] = entity_type
    if entity_id:
        params["entity_id"] = entity_id
    events = get_client().get("/api/v1/audit-events", params)
    if json_out:
        typer.echo(_json.dumps(events, indent=2))
        return
    table = Table(title="Audit events")
    table.add_column("When")
    table.add_column("Event")
    table.add_column("Entity")
    table.add_column("Actor")
    for e in events:
        table.add_row(e["created_at"], e["event_type"], f"{e['entity_type']}/{e['entity_id']}", e["actor"])
    console.print(table)
