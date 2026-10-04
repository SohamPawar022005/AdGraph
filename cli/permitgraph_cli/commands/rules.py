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
def list_rules(status: Optional[str] = typer.Option(None, help="Filter by status (verified|candidate|...)"),
               json_out: bool = typer.Option(False, "--json")):
    """List rules-as-code with their verification status."""
    rules = get_client().get("/api/v1/rules")
    if status:
        rules = [r for r in rules if r.get("status") == status]
    if json_out:
        typer.echo(_json.dumps(rules, indent=2))
        return
    table = Table(title="Rules")
    table.add_column("ID")
    table.add_column("Status")
    table.add_column("Verification")
    table.add_column("Source")
    for r in rules:
        table.add_row(r["id"], r["status"] or "-", r["verification_status"] or "-",
                      f"{r['source_document_id']} {r['source_section']}")
    console.print(table)


@app.command("show")
def show_rule(rule_id: str, json_out: bool = typer.Option(False, "--json")):
    """Show a rule's full version history."""
    rule = get_client().get(f"/api/v1/rules/{rule_id}")
    if json_out:
        typer.echo(_json.dumps(rule, indent=2))
        return
    console.print(f"[bold]{rule['id']}[/bold] -- {rule['name']}")
    for v in rule["versions"]:
        console.print(
            f"  {v['version']}: {v['status']} / {v['verification_status']} "
            f"(confidence {v['confidence']}) -- {v['source_document_id']} {v['source_section']}"
        )


@app.command("evaluate")
def evaluate(
    industry: str = typer.Option(...),
    district: str = typer.Option("Pune"),
    employees: int = typer.Option(50),
    investment: float = typer.Option(25_000_000),
    project_stage: str = typer.Option("new"),
    land_type: str = typer.Option("midc_industrial_area"),
    jurisdiction: str = typer.Option("Maharashtra"),
    json_out: bool = typer.Option(False, "--json"),
):
    """Run the raw rule engine (POST /api/v1/rules/evaluate) against a business profile."""
    profile = {
        "industry": industry, "district": district, "employees": employees,
        "investment": investment, "project_stage": project_stage, "land_type": land_type,
        "jurisdiction": jurisdiction,
    }
    result = get_client().post("/api/v1/rules/evaluate", {"business_profile": profile})
    typer.echo(_json.dumps(result, indent=2) if json_out else result)
