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


@app.command("source-docs")
def list_source_documents(json_out: bool = typer.Option(False, "--json")):
    """List uploaded regulatory source documents (Acts, Rules, Amendments)."""
    docs = get_client().get("/api/v1/regulations/source-documents/list")
    if json_out:
        typer.echo(_json.dumps(docs, indent=2))
        return
    table = Table(title="Regulatory Source Documents")
    table.add_column("ID")
    table.add_column("Title")
    table.add_column("Version")
    table.add_column("OCR Status")
    table.add_column("Pages")
    for d in docs:
        table.add_row(d["id"], d["title"], d["version_label"], d["ocr_status"], str(d.get("page_count", 1)))
    console.print(table)


@app.command("compare")
def compare_docs(
    old_doc_id: str = typer.Option(..., "--old", help="Base document ID"),
    new_doc_id: str = typer.Option(..., "--new", help="Amended document ID"),
    synthetic: bool = typer.Option(False, "--synthetic", help="Mark as synthetic test comparison"),
    json_out: bool = typer.Option(False, "--json"),
):
    """Compare two stored regulatory documents and report detected changes."""
    payload = {
        "old_document_id": old_doc_id,
        "new_document_id": new_doc_id,
        "is_synthetic": synthetic,
    }
    result = get_client().post("/api/v1/regulations/compare-source-documents", payload)
    if json_out:
        typer.echo(_json.dumps(result, indent=2))
        return
    console.print(f"[bold green]Detected {len(result)} change(s) between {old_doc_id} and {new_doc_id}:[/bold green]\n")
    for c in result:
        console.print(f"[bold]{c['change_type'].upper()}[/bold] in {c['section_label']}: {c['summary']}")
        console.print(f"  id={c['id']} | confidence={c['confidence']} | verification={c['verification_status']}")

