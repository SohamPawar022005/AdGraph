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
def list_applications(
    limit: int = 25, offset: int = 0,
    business_profile_id: Optional[str] = typer.Option(None),
    state: Optional[str] = typer.Option(None),
    json_out: bool = typer.Option(False, "--json"),
):
    """List applications (paginated, filterable)."""
    params = {"limit": limit, "offset": offset}
    if business_profile_id:
        params["business_profile_id"] = business_profile_id
    if state:
        params["state"] = state
    page = get_client().get("/api/v1/applications", params)
    if json_out:
        typer.echo(_json.dumps(page, indent=2))
        return
    table = Table(title=f"Applications ({page['total']} total)")
    table.add_column("ID")
    table.add_column("Approval")
    table.add_column("State")
    for a in page["items"]:
        table.add_row(a["id"], a["approval_id"], a["state"])
    console.print(table)


@app.command("show")
def show_application(application_id: str, json_out: bool = typer.Option(False, "--json")):
    """Show an application with its SLA snapshot and workflow timeline."""
    data = get_client().get(f"/api/v1/applications/{application_id}")
    if json_out:
        typer.echo(_json.dumps(data, indent=2))
        return
    console.print(f"[bold]{data['approval_id']}[/bold] -- {data['state']}")
    sla = data["sla"]
    if sla.get("state") != "not_started":
        console.print(
            f"SLA: {sla['state']} -- elapsed {sla.get('elapsed_days', 0):.1f}d / "
            f"limit {sla.get('limit_days')}d (remaining {sla.get('remaining_days', 0):.1f}d)"
        )
    for e in data["events"]:
        console.print(f"  {e['occurred_at']}: {e['from_state'] or '(start)'} -> {e['to_state']}")


@app.command("create")
def create_application(business_profile_id: str = typer.Option(...), approval_id: str = typer.Option(...),
                        limit_days: int = typer.Option(21)):
    """File a new application."""
    body = {"business_profile_id": business_profile_id, "approval_id": approval_id, "limit_days": limit_days}
    app_row = get_client().post("/api/v1/applications", body)
    typer.secho(f"Created application {app_row['id']}", fg=typer.colors.GREEN)


@app.command("transition")
def transition(application_id: str, target_state: str, actor: str = typer.Option("cli-user")):
    """Transition an application to a new workflow state."""
    body = {"target_state": target_state, "actor": actor}
    result = get_client().post(f"/api/v1/applications/{application_id}/transition", body)
    typer.secho(f"Application {application_id} is now {result['state']}", fg=typer.colors.GREEN)
