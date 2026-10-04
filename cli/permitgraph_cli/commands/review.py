from __future__ import annotations

import json as _json

import typer
from rich.console import Console
from rich.table import Table

from ..client import ApiClientError, fail, get_client

app = typer.Typer(
    no_args_is_help=True,
    help="Human verification queue. Requires logging in as a REGULATORY_REVIEWER or ADMIN (see `permitgraph auth login`).",
)
console = Console()

ENTITY_TYPES = ["rule_version", "approval", "approval_dependency", "regulatory_change"]


@app.command("queue")
def queue(entity_type: str = typer.Argument(..., help=f"One of: {', '.join(ENTITY_TYPES)}"),
          json_out: bool = typer.Option(False, "--json")):
    """List CANDIDATE items pending review for an entity type."""
    items = get_client().get(f"/api/v1/review/queue/{entity_type}")
    if json_out:
        typer.echo(_json.dumps(items, indent=2))
        return
    table = Table(title=f"Pending review: {entity_type}")
    table.add_column("ID")
    table.add_column("Status")
    table.add_column("Source")
    table.add_column("Confidence")
    for i in items:
        table.add_row(i["id"], i["verification_status"],
                      f"{i.get('source_document_id') or '-'} {i.get('source_section') or ''}",
                      str(i.get("confidence")))
    console.print(table)


def _act(entity_type: str, entity_id: str, action: str, reason: str) -> None:
    try:
        result = get_client().post(f"/api/v1/review/{entity_type}/{entity_id}", {"action": action, "reason": reason})
    except ApiClientError as exc:
        fail(str(exc))
        return
    typer.secho(f"{entity_type}/{entity_id}: {result['previous_status']} -> {result['new_status']}", fg=typer.colors.GREEN)


@app.command("approve")
def approve(entity_type: str, entity_id: str, reason: str = typer.Option(..., help="Required: why this is being approved")):
    """Approve a CANDIDATE item, promoting it to VERIFIED. Requires REGULATORY_REVIEWER/ADMIN."""
    _act(entity_type, entity_id, "approve", reason)


@app.command("reject")
def reject(entity_type: str, entity_id: str, reason: str = typer.Option(..., help="Required: why this is being rejected")):
    """Reject a CANDIDATE item. Requires REGULATORY_REVIEWER/ADMIN."""
    _act(entity_type, entity_id, "reject", reason)


@app.command("flag")
def flag(entity_type: str, entity_id: str, reason: str = typer.Option(..., help="Required: what's wrong with it")):
    """Flag an item for follow-up without changing its verification status outcome directly."""
    _act(entity_type, entity_id, "flag", reason)
