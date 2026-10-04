"""Load rules-as-code YAML files into Rule objects."""

from __future__ import annotations

import pathlib
from typing import List

import yaml

from .models import Rule


def load_rule_file(path: str | pathlib.Path) -> Rule:
    with open(path, "r", encoding="utf-8") as fh:
        payload = yaml.safe_load(fh)
    return Rule.model_validate(payload)


def load_rules_dir(path: str | pathlib.Path) -> List[Rule]:
    directory = pathlib.Path(path)
    rules = []
    for file_path in sorted(directory.glob("*.yaml")):
        rules.append(load_rule_file(file_path))
    for file_path in sorted(directory.glob("*.yml")):
        rules.append(load_rule_file(file_path))
    return rules
