"""`permitgraph` -- developer/operator CLI for the PermitGraph API.

This is a thin REST client (see permitgraph_cli/client.py) -- it demonstrates and
exercises the exact same public API contract the web frontend uses, rather than
reaching into the database directly, so anything you can do here, any other API
consumer can do too.

Run `permitgraph --help` for the full command tree.
"""
from __future__ import annotations

import typer

from .commands import (
    applications,
    approvals,
    audit,
    auth,
    businesses,
    changes,
    documents,
    regulations,
    review,
    rules,
    validate,
)

app = typer.Typer(
    name="permitgraph",
    help=(
        "Developer/operator CLI for PermitGraph -- regulatory intelligence & "
        "compliance automation infrastructure. NOT a government portal; see "
        "the repository README for scope and limitations."
    ),
    no_args_is_help=True,
)

app.add_typer(auth.app, name="auth", help="Authenticate against the API")
app.add_typer(regulations.app, name="regulations", help="Browse source Acts and sections")
app.add_typer(rules.app, name="rules", help="Inspect and evaluate rules-as-code")
app.add_typer(approvals.app, name="approvals", help="Approval catalogue and dependency graph")
app.add_typer(businesses.app, name="businesses", help="Business profiles")
app.add_typer(applications.app, name="applications", help="Permit application workflow")
app.add_typer(changes.app, name="changes", help="Regulatory change detection + impact analysis")
app.add_typer(documents.app, name="documents", help="Document ingestion & validation")
app.add_typer(audit.app, name="audit", help="Audit log")
app.add_typer(review.app, name="review", help="Human verification review queue (role-gated)")
app.add_typer(validate.app, name="validate", help="Local, API-free validation of a candidate rules directory")


@app.command()
def status(api_url: str = typer.Option(None, help="Override the configured API base URL for this call")):
    """Check API health + database readiness."""
    from .client import Client
    from .config import Session

    session = Session.load()
    if api_url:
        session.api_url = api_url
    client = Client(session)
    health = client.get("/health")
    ready = client.get("/ready")
    typer.echo(f"API:      {session.api_url}")
    typer.echo(f"Health:   {health}")
    typer.echo(f"Ready:    {ready}")


@app.command()
def discover(
    industry: str = typer.Option(..., help="e.g. food_processing"),
    district: str = typer.Option("Pune"),
    employees: int = typer.Option(50),
    investment: float = typer.Option(25_000_000),
    project_stage: str = typer.Option("new"),
    land_type: str = typer.Option("midc_industrial_area"),
    hazardous: bool = typer.Option(False, "--hazardous/--no-hazardous"),
    village_industry: bool = typer.Option(False, "--village/--no-village"),
    jurisdiction: str = typer.Option("Maharashtra"),
    json_out: bool = typer.Option(False, "--json", help="Print raw JSON instead of a table"),
):
    """Run permission discovery for a described business (POST /api/v1/permissions/discover)."""
    import json as _json

    from rich.console import Console
    from rich.table import Table

    from .client import get_client

    body = {
        "industry": industry,
        "district": district,
        "employees": employees,
        "investment": investment,
        "project_stage": project_stage,
        "land_type": land_type,
        "hazardous_material": hazardous,
        "is_village_industry": village_industry,
        "jurisdiction": jurisdiction,
    }
    result = get_client().post("/api/v1/permissions/discover", body)

    if json_out:
        typer.echo(_json.dumps(result, indent=2))
        return

    console = Console()
    console.print(f"[yellow]{result['disclaimer']}[/yellow]\n")
    table = Table(title=f"{len(result['permissions'])} applicable permission(s)")
    table.add_column("Approval")
    table.add_column("Rule")
    table.add_column("Status")
    table.add_column("Confidence")
    table.add_column("Source")
    for p in result["permissions"]:
        table.add_row(
            p["approval_id"], p["rule_id"], p["verification_status"], f"{p['confidence']:.2f}",
            f"{p['source']['document']} {p['source'].get('section') or ''}",
        )
    console.print(table)
    if result["insufficient_input"]:
        descriptions = [
            f"{i['rule_name']} (needs: {'; '.join(i['reasons'])})" for i in result["insufficient_input"]
        ]
        console.print(f"[red]Insufficient input for: {', '.join(descriptions)}[/red]")


if __name__ == "__main__":
    app()
