from __future__ import annotations

import json as _json

import typer
from rich.console import Console
from rich.table import Table

from ..client import get_client

app = typer.Typer(no_args_is_help=True)
console = Console()


@app.command("list")
def list_regulations(json_out: bool = typer.Option(False, "--json")):
    """List the source Acts loaded into PermitGraph."""
    regs = get_client().get("/api/v1/regulations")
    if json_out:
        typer.echo(_json.dumps(regs, indent=2))
        return
    table = Table(title="Regulations")
    table.add_column("ID")
    table.add_column("Name")
    table.add_column("Short code")
    table.add_column("Versions")
    for r in regs:
        table.add_row(r["id"], r["name"], r["short_code"], str(len(r.get("versions", []))))
    console.print(table)


@app.command("show")
def show_regulation(regulation_id: str, json_out: bool = typer.Option(False, "--json")):
    """Show a regulation's versions and sections."""
    reg = get_client().get(f"/api/v1/regulations/{regulation_id}")
    if json_out:
        typer.echo(_json.dumps(reg, indent=2))
        return
    console.print(f"[bold]{reg['name']}[/bold] ({reg['short_code']}, {reg['jurisdiction']})")
    for v in reg["versions"]:
        console.print(f"\n[cyan]Version {v['version_label']}[/cyan] -- {v['verification_status']}")
        for s in v["sections"]:
            heading = f" -- {s['heading']}" if s.get("heading") else ""
            console.print(f"  Section {s['number']}{heading}")
