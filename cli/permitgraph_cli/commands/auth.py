from __future__ import annotations

import typer

from ..client import Client, fail
from ..config import Session

app = typer.Typer(no_args_is_help=True)


@app.command()
def login(
    email: str = typer.Option(..., prompt=True),
    password: str = typer.Option(..., prompt=True, hide_input=True),
    api_url: str = typer.Option(None, help="Override the configured API base URL"),
):
    """Log in and persist a bearer token at ~/.permitgraph/session.json."""
    session = Session.load()
    if api_url:
        session.api_url = api_url
    client = Client(session)
    try:
        res = client.post("/api/v1/auth/login", {"email": email, "password": password})
    except Exception as exc:  # noqa: BLE001
        fail(f"Login failed: {exc}")
        return
    session.token = res["access_token"]
    session.role = res["role"]
    session.email = email
    session.save()
    typer.secho(f"Logged in as {email} ({res['role']})", fg=typer.colors.GREEN)


@app.command()
def whoami():
    """Show the currently stored session."""
    session = Session.load()
    if not session.token:
        typer.echo("Not logged in. Run `permitgraph auth login`.")
        raise typer.Exit(code=1)
    typer.echo(f"API: {session.api_url}")
    typer.echo(f"Email: {session.email}")
    typer.echo(f"Role: {session.role}")


@app.command()
def logout():
    """Clear the stored session."""
    session = Session()
    session.save()
    typer.echo("Logged out.")
