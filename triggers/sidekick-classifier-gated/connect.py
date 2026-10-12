#!/usr/bin/env python3

import argparse
import importlib.machinery
import importlib.util
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import subprocess
import sys
import tempfile


def load_env(path, explicit):
    if not path.exists() and not explicit:
        return
    for line_number, line in enumerate(path.read_text().splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:]
        name, separator, value = line.partition("=")
        name = name.strip()
        if not separator or not re.fullmatch(r"[A-Za-z_][A-Za-z_0-9]*", name):
            raise ValueError(f"invalid env assignment on line {line_number}")
        values = shlex.split(value, comments=True)
        if len(values) > 1:
            raise ValueError(f"quote env values with spaces on line {line_number}")
        os.environ.setdefault(name, values[0] if values else "")


def main():
    parser = argparse.ArgumentParser(description="Connect an agent with classifier-gated call context.")
    parser.add_argument("--call", help="Select a call ID; defaults to the active call")
    parser.add_argument("--dry-run", action="store_true", help="Print the Connect command without launching an agent")
    args = parser.parse_args()
    trigger_dir = Path(__file__).resolve().parent
    env_file = os.environ.get("TUPLE_JEV_ENV_FILE")
    load_env(Path(env_file).expanduser() if env_file else trigger_dir / ".env", bool(env_file))
    cli = shutil.which(os.environ.get("TUPLE_JEV_CLI", "tuple"))
    if not cli:
        raise ValueError("Tuple CLI not found; set TUPLE_JEV_CLI to tuple or tuple-staging")
    predicate = trigger_dir / "wake-if-jev"
    loader = importlib.machinery.SourceFileLoader("wake_jev", str(predicate))
    spec = importlib.util.spec_from_loader(loader.name, loader)
    wake = importlib.util.module_from_spec(spec)
    loader.exec_module(wake)
    config = wake.settings(os.environ)
    if not config["key"]:
        raise ValueError("TYPESAFE_API_KEY is required; set it in your shell profile or the trigger's .env")
    help_result = subprocess.run([cli, "capture", "follow", "--help"], capture_output=True, text=True, check=True)
    if "--wake-if" not in help_result.stdout or "--on-wake" not in help_result.stdout:
        raise ValueError("this Tuple CLI needs capture follow --wake-if and --on-wake support")
    call_id = args.call or os.environ.get("TUPLE_TRIGGER_CALL_ID")
    if not call_id:
        state = json.loads(subprocess.run([cli, "--format", "json", "state"], capture_output=True, text=True, check=True).stdout)
        call_id = (state.get("call") or {}).get("call_id")
        if not state.get("in_call") or not call_id:
            raise ValueError("no active call; start a captured call or pass --call <id> for a prompt preview")
    reader = [cli, "--format", "json", "capture", "follow", call_id, "--on-wake", "--wake-if", str(predicate)]
    purpose = (
        config["purpose"] + "\n\n"
        "Use this reader for live call context throughout the session:\n\n"
        "Reader command:\n" + shlex.join(reader) + "\n\n"
        "1. Start the reader once with the guide's supported background delivery tool. "
        "Keep the selected call and all Capture categories. Retain the reader through "
        "Capture restarts until the call ends or I stop you. If your tools cannot deliver "
        "a running stream's output to later turns, report that limitation and stop.\n"
        "2. Let the predicate decide when routine context reaches you. Tuple can also "
        "deliver initial catch-up, direct chat, lifecycle boundaries, and a full buffer.\n"
        "3. Contribute when you have something useful to add. Receiving context alone "
        "does not require a reply.\n"
        "4. If the classifier or reader fails, stop following and report the error. "
        "Keep the classifier-gated policy when recovering."
    )
    command = [cli, "connect", "--call", call_id]
    if os.environ.get("TUPLE_JEV_HARNESS"):
        command.extend(["--harness", os.environ["TUPLE_JEV_HARNESS"]])
    command.append(purpose)
    if args.dry_run:
        print(shlex.join(command))
        return 0
    workdir = tempfile.mkdtemp(prefix="tuple-sidekick-classifier-gated-")
    if os.environ.get("TUPLE_JEV_DEBUG") == "1":
        os.environ.setdefault("TUPLE_JEV_LOG_FILE", str(Path(workdir) / "wake-decisions.jsonl"))
        print(f"Jev decisions: {os.environ['TUPLE_JEV_LOG_FILE']}", flush=True)
    return subprocess.run(command, cwd=workdir).returncode


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:
        print(f"sidekick-classifier-gated: {error}", file=sys.stderr)
        sys.exit(2)
