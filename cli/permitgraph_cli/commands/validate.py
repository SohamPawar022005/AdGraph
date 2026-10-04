from __future__ import annotations

import pathlib

import typer
from rich.console import Console

app = typer.Typer(no_args_is_help=True)
console = Console()


@app.command("rules-dir")
def rules_dir(
    path: pathlib.Path = typer.Argument(..., exists=True, file_okay=False, help="Directory of rule YAML files"),
):
    """Load + validate every rule YAML in a directory using rules_engine, with no API or
    database involved. Useful in CI (see .github/workflows) to catch malformed candidate
    rules before they're ever seeded or reviewed."""
    from rules_engine import load_rules_dir

    try:
        rules = load_rules_dir(path)
    except Exception as exc:  # noqa: BLE001
        typer.secho(f"FAILED to load rules from {path}: {exc}", fg=typer.colors.RED)
        raise typer.Exit(code=1)

    console.print(f"[green]Loaded {len(rules)} rule(s) from {path} without error.[/green]")
    by_status: dict[str, int] = {}
    for r in rules:
        by_status[r.status] = by_status.get(r.status, 0) + 1
    for status, count in sorted(by_status.items()):
        console.print(f"  {status}: {count}")

    missing_source = [r.id for r in rules if not r.source or not r.source.document]
    if missing_source:
        console.print(f"[red]Rules missing a source document reference: {missing_source}[/red]")
        raise typer.Exit(code=1)
