from __future__ import annotations

import json as _json

import typer
from rich.console import Console
from rich.table import Table

from ..client import get_client

app = typer.Typer(no_args_is_help=True)
console = Console()


@app.command("list")
def list_approvals(json_out: bool = typer.Option(False, "--json")):
    """List the approval catalogue."""
    approvals = get_client().get("/api/v1/approvals")
    if json_out:
        typer.echo(_json.dumps(approvals, indent=2))
        return
    table = Table(title="Approvals")
    table.add_column("ID")
    table.add_column("Category")
    table.add_column("Synthetic?")
    table.add_column("Verification")
    for a in approvals:
        table.add_row(a["id"], a["category"], str(a["is_synthetic"]), a["verification_status"])
    console.print(table)


@app.command("show")
def show_approval(approval_id: str, json_out: bool = typer.Option(False, "--json")):
    """Show an approval and its dependency closure."""
    approval = get_client().get(f"/api/v1/approvals/{approval_id}")
    deps = get_client().get(f"/api/v1/approvals/{approval_id}/dependencies")
    if json_out:
        typer.echo(_json.dumps({"approval": approval, "dependencies": deps}, indent=2))
        return
    console.print(f"[bold]{approval['name']}[/bold] ({approval['id']})")
    console.print(f"Category: {approval['category']} / Synthetic: {approval['is_synthetic']}")
    console.print(f"Upstream (prerequisites): {', '.join(deps['upstream_closure']) or 'none'}")
    console.print(f"Downstream (depends on this): {', '.join(deps['downstream_closure']) or 'none'}")


@app.command("graph")
def graph(json_out: bool = typer.Option(False, "--json")):
    """Print the full approval dependency graph."""
    g = get_client().get("/api/v1/approvals/graph")
    if json_out:
        typer.echo(_json.dumps(g, indent=2))
        return
    console.print(f"{len(g['nodes'])} nodes, {len(g['edges'])} edges, cycle: {g['has_cycle']}")
    for e in g["edges"]:
        marker = "synthetic" if e["is_synthetic"] else "real"
        console.print(f"  {e['source']} --[{e['relation']}:{marker}]--> {e['target']}")
