"""Thin HTTP client wrapping the PermitGraph REST API for the CLI."""
from __future__ import annotations

from typing import Any, Optional

import httpx
import typer

from .config import Session


class ApiClientError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(f"API error {status_code}: {detail}")
        self.status_code = status_code
        self.detail = detail


class Client:
    def __init__(self, session: Optional[Session] = None):
        self.session = session or Session.load()

    def _headers(self) -> dict:
        headers = {}
        if self.session.token:
            headers["Authorization"] = f"Bearer {self.session.token}"
        return headers

    def _handle(self, resp: httpx.Response) -> Any:
        if resp.status_code >= 400:
            detail = resp.text
            try:
                detail = resp.json().get("detail", detail)
            except Exception:
                pass
            raise ApiClientError(resp.status_code, str(detail))
        if resp.status_code == 204 or not resp.content:
            return None
        return resp.json()

    def get(self, path: str, params: Optional[dict] = None) -> Any:
        with httpx.Client(base_url=self.session.api_url, timeout=30) as c:
            return self._handle(c.get(path, params=params, headers=self._headers()))

    def post(self, path: str, json_body: Optional[dict] = None) -> Any:
        with httpx.Client(base_url=self.session.api_url, timeout=30) as c:
            return self._handle(c.post(path, json=json_body, headers=self._headers()))

    def post_file(self, path: str, file_path: str, form: dict) -> Any:
        with httpx.Client(base_url=self.session.api_url, timeout=60) as c:
            with open(file_path, "rb") as f:
                files = {"file": (file_path.split("/")[-1], f)}
                return self._handle(c.post(path, data=form, files=files, headers=self._headers()))


def get_client() -> Client:
    return Client()


def fail(message: str) -> None:
    typer.secho(message, fg=typer.colors.RED, err=True)
    raise typer.Exit(code=1)
