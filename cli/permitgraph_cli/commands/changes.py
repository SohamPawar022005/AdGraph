from __future__ import annotations

import json as _json
import pathlib
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from ..client import get_client

app = typer.Typer(no_args_is_help=True)
console = Console()


@app.command("analyze")
def analyze(
    section: str = typer.Option(..., help="Section label, e.g. 'Section 16'"),
    old_file: pathlib.Path = typer.Option(..., exists=True, help="File containing the old section text"),
    new_file: pathlib.Path = typer.Option(..., exists=True, help="File containing the new section text"),
    synthetic: bool = typer.Option(True, help="Mark as a synthetic/benchmark scenario (default) vs. a real detected change"),
    json_out: bool = typer.Option(False, "--json"),
):
    """Run change detection between two section-text files (POST /api/v1/regulatory-changes/analyze)."""
    body = {
        "old_sections": {section: old_file.read_text()},
        "new_sections": {section: new_file.read_text()},
        "is_synthetic": synthetic,
    }
    result = get_client().post("/api/v1/regulatory-changes/analyze", body)
    if json_out:
        typer.echo(_json.dumps(result, indent=2))
        return
    for c in result:
        console.print(f"[bold]{c['change_type']}[/bold] in {c['section_label']}: {c['summary']}")
        console.print(f"  id={c['id']} verification_status={c['verification_status']}")


@app.command("list")
def list_changes(json_out: bool = typer.Option(False, "--json")):
    """List detected regulatory changes."""
    changes = get_client().get("/api/v1/regulatory-changes")
    if json_out:
        typer.echo(_json.dumps(changes, indent=2))
        return
    table = Table(title="Regulatory changes")
    table.add_column("ID")
    table.add_column("Type")
    table.add_column("Section")
    table.add_column("Verification")
    table.add_column("Synthetic?")
    for c in changes:
        table.add_row(c["id"], c["change_type"], c["section_label"] or "-", c["verification_status"], str(c["is_synthetic"]))
    console.print(table)


@app.command("show")
def show_change(change_id: str, json_out: bool = typer.Option(False, "--json")):
    """Show a regulatory change's old/new text and affected rules/approvals."""
    c = get_client().get(f"/api/v1/regulatory-changes/{change_id}")
    if json_out:
        typer.echo(_json.dumps(c, indent=2))
        return
    console.print(f"[red]- {c['old_text']}[/red]")
    console.print(f"[green]+ {c['new_text']}[/green]")
    console.print(f"Affected rules: {', '.join(c['affected_rule_ids']) or 'none'}")
    console.print(f"Affected approvals: {', '.join(c['affected_approval_ids']) or 'none'}")


@app.command("impact")
def impact(change_id: str, json_out: bool = typer.Option(False, "--json")):
    """Run / fetch the impact analysis for a regulatory change (GET /api/v1/impact/{id})."""
    result = get_client().get(f"/api/v1/impact/{change_id}")
    if json_out:
        typer.echo(_json.dumps(result, indent=2))
        return
    console.print(f"Impact score: {result['impact_score']:.2f} (bounded [0,1] prioritisation signal, not a legal risk score)")
    console.print(result["explanation"])
    if result.get("evidence_paths"):
        console.print(f"\n[bold]Evidence Paths ({len(result['evidence_paths'])}):[/bold]")
        for p in result["evidence_paths"][:5]:
            console.print(f"  [{p['tier']}] {p['impact_type'].upper()}: {' -> '.join(p['path'])}")
    console.print(f"[yellow]{result['disclaimer']}[/yellow]")


@app.command("export")
def export_change(
    change_id: str = typer.Argument(..., help="Regulatory change ID"),
    output_file: Optional[pathlib.Path] = typer.Option(None, "--out", "-o", help="Path to write JSON export"),
):
    """Export complete structured impact analysis and change provenance report as JSON."""
    result = get_client().get(f"/api/v1/impact/{change_id}/export")
    formatted = _json.dumps(result, indent=2)
    if output_file:
        output_file.write_text(formatted, encoding="utf-8")
        console.print(f"[green]Report exported successfully to {output_file}[/green]")
    else:
        typer.echo(formatted)

