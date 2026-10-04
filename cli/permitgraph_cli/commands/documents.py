from __future__ import annotations

import json as _json
from typing import Optional

import typer
from rich.console import Console
from rich.table import Table

from ..client import get_client

app = typer.Typer(no_args_is_help=True)
console = Console()


@app.command("upload")
def upload(
    file_path: str = typer.Argument(..., help="Path to a .pdf/.png/.jpg file"),
    document_type: str = typer.Option(..., help="processing_fee_receipt | identity_proof | project_report"),
    business_profile_id: Optional[str] = typer.Option(None),
    application_id: Optional[str] = typer.Option(None),
):
    """Upload a document."""
    form = {"document_type": document_type}
    if business_profile_id:
        form["business_profile_id"] = business_profile_id
    if application_id:
        form["application_id"] = application_id
    doc = get_client().post_file("/api/v1/documents/upload", file_path, form)
    typer.secho(f"Uploaded document {doc['id']} (hash {doc['content_hash'][:12]}...)", fg=typer.colors.GREEN)


@app.command("validate")
def validate(document_id: str, fields_json: str = typer.Option("{}", help="JSON object of extracted fields")):
    """Run the deterministic structural validator against a document's extracted fields."""
    fields = _json.loads(fields_json)
    result = get_client().post(f"/api/v1/documents/{document_id}/validate", fields)
    typer.echo(_json.dumps(result, indent=2))


@app.command("list")
def list_documents(limit: int = 25, offset: int = 0, json_out: bool = typer.Option(False, "--json")):
    """List documents (paginated)."""
    page = get_client().get("/api/v1/documents", {"limit": limit, "offset": offset})
    if json_out:
        typer.echo(_json.dumps(page, indent=2))
        return
    table = Table(title=f"Documents ({page['total']} total)")
    table.add_column("ID")
    table.add_column("Filename")
    table.add_column("Type")
    table.add_column("Status")
    for d in page["items"]:
        table.add_row(d["id"], d["original_filename"], d["document_type"], d["validation_status"])
    console.print(table)
