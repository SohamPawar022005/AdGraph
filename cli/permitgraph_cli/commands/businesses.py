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
def list_businesses(limit: int = 25, offset: int = 0, json_out: bool = typer.Option(False, "--json")):
    """List business profiles (paginated)."""
    page = get_client().get("/api/v1/businesses", {"limit": limit, "offset": offset})
    if json_out:
        typer.echo(_json.dumps(page, indent=2))
        return
    table = Table(title=f"Businesses ({page['total']} total)")
    table.add_column("ID")
    table.add_column("Name")
    table.add_column("Industry")
    table.add_column("District")
    for b in page["items"]:
        table.add_row(b["id"], b["name"], b["industry"], b["district"] or "-")
    console.print(table)


@app.command("show")
def show_business(business_id: str, json_out: bool = typer.Option(False, "--json")):
    """Show a single business profile."""
    biz = get_client().get(f"/api/v1/businesses/{business_id}")
    typer.echo(_json.dumps(biz, indent=2) if json_out else biz)


@app.command("create")
def create_business(
    name: str = typer.Option(...),
    industry: str = typer.Option(...),
    district: Optional[str] = typer.Option(None),
    employees: Optional[int] = typer.Option(None),
    investment: Optional[float] = typer.Option(None),
    jurisdiction: str = typer.Option("Maharashtra"),
    synthetic: bool = typer.Option(False, help="Mark as synthetic demo data"),
):
    """Create a new business profile."""
    body = {
        "name": name, "industry": industry, "district": district,
        "employees": employees, "investment": investment, "jurisdiction": jurisdiction,
        "is_synthetic": synthetic,
    }
    biz = get_client().post("/api/v1/businesses", body)
    typer.secho(f"Created business {biz['id']}", fg=typer.colors.GREEN)
