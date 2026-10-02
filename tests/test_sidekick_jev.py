import http.server
import json
import os
from pathlib import Path
import shlex
import subprocess
import tempfile
import threading
import time
import unittest


TRIGGER = Path(__file__).resolve().parents[1] / "triggers" / "sidekick-classifier-gated"


class ClassifierTests(unittest.TestCase):
    def setUp(self):
        self.requests = []
        self.status = 200
        self.delay = 0
        self.result = {"model": "jev-1.13.0", "answers": {
            "meaningful": {"type": "noul", "noul": 0.9},
            "thought_complete": {"type": "noul", "noul": 0.8},
        }, "usage": {"input_tokens": 300}}
        owner = self

        class Handler(http.server.BaseHTTPRequestHandler):
            def do_POST(self):
                owner.requests.append({"body": json.loads(self.rfile.read(int(self.headers["Content-Length"]))),
                                       "authorization": self.headers["Authorization"]})
                time.sleep(owner.delay)
                self.send_response(owner.status)
                if owner.status == 302:
                    self.send_header("Location", "/redirected")
                self.end_headers()
                try:
                    self.wfile.write(json.dumps(owner.result).encode())
                except (BrokenPipeError, ConnectionResetError):
                    pass

            def log_message(self, *args):
                pass

        self.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.env = {k: v for k, v in os.environ.items() if not k.startswith(("TUPLE_JEV_", "TYPESAFE_"))}
        self.env.update(TYPESAFE_API_KEY="test-secret", TUPLE_JEV_API_URL=f"http://127.0.0.1:{self.server.server_port}/v1/systemone")

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def invoke(self, records=None, request=None, **env):
        if request is None:
            request = {"version": 1, "elapsed_ms": 20000, "records": records if records is not None else [
                {"type": "transcription_finished", "data": {"user_id": 42, "text": "The cursor advances before delivery succeeds."}}
            ]}
        return subprocess.run([str(TRIGGER / "wake-if-jev")], input=json.dumps(request), text=True,
                              capture_output=True, env={**self.env, **env}, timeout=10)

    def test_delivers_meaningful_completed_speech_using_native_api(self):
        result = self.invoke(TUPLE_JEV_PROMPT="Does this contain a new bug?", TUPLE_JEV_PURPOSE="Watch for regressions.")
        self.assertEqual((result.returncode, result.stdout, result.stderr), (0, "", ""))
        sent = self.requests[0]
        self.assertEqual(sent["authorization"], "Bearer test-secret")
        self.assertEqual(sent["body"]["state"], {
            "purpose": "Watch for regressions.", "seconds_since_last_delivery": 20.0,
            "pending_transcript": [{"speaker": "42", "text": "The cursor advances before delivery succeeds."}],
        })
        self.assertEqual(sent["body"]["questions"]["meaningful"], {"type": "noul", "instructions": "Does this contain a new bug?"})

    def test_buffers_low_value_or_incomplete_speech_and_respects_thresholds(self):
        for meaningful, complete, expected in [(0.9, 0.2, 1), (0.1, 0.9, 1), (0.61, 0.9, 1), (0.9, 0.9, 0)]:
            with self.subTest(meaningful=meaningful, complete=complete):
                self.result["answers"]["meaningful"]["noul"] = meaningful
                self.result["answers"]["thought_complete"]["noul"] = complete
                self.assertEqual(self.invoke(TUPLE_JEV_THRESHOLD="0.7").returncode, expected)

    def test_skips_unfinished_records_and_small_initial_context(self):
        self.assertEqual(self.invoke(records=[{"type": "transcription_updated", "data": {"text": "Maybe"}}]).returncode, 1)
        self.assertEqual(self.invoke(request={"version": 1, "elapsed_ms": 1, "records": [
            {"type": "transcription_finished", "data": {"text": "Hello"}}
        ]}).returncode, 1)
        self.assertEqual(self.invoke(records=[{"type": "agent_prompt", "data": {"message": "Please help"}}]).returncode, 0)
        self.assertEqual(self.requests, [])

    def test_reports_provider_errors_without_echoing_credentials_or_response_body(self):
        self.status = 401
        self.result = {"error": "test-secret reflected by upstream"}
        result = self.invoke()
        self.assertEqual((result.returncode, result.stdout, result.stderr), (2, "", "wake-if-jev: classifier returned HTTP 401\n"))

    def test_rejects_redirects_instead_of_forwarding_bearer_credentials(self):
        self.status = 302
        result = self.invoke()
        self.assertEqual((result.returncode, result.stderr), (2, "wake-if-jev: classifier returned HTTP 302\n"))
        self.assertEqual(len(self.requests), 1)

    def test_reports_timeout(self):
        self.delay = 0.3
        result = self.invoke(TUPLE_JEV_TIMEOUT_SECONDS="0.1")
        self.assertEqual((result.returncode, result.stderr), (2, "wake-if-jev: classifier request timed out or failed\n"))

    def test_rejects_malformed_protocol_configuration_and_probabilities(self):
        invalid = self.invoke(request={"version": 2, "elapsed_ms": 0, "records": []})
        self.assertEqual((invalid.returncode, invalid.stderr), (2, "wake-if-jev: expected Tuple wake-if protocol version 1\n"))
        self.assertEqual(self.invoke(TUPLE_JEV_THRESHOLD="NaN").returncode, 2)
        for value in ("0.9", True, 1.2, None):
            with self.subTest(value=value):
                self.result["answers"]["meaningful"]["noul"] = value
                result = self.invoke()
                self.assertEqual((result.returncode, result.stderr), (2, "wake-if-jev: classifier returned an invalid meaningful probability\n"))
        for response in (None, {"answers": []}, {"answers": {"meaningful": []}}):
            with self.subTest(response=response):
                self.result = response
                result = self.invoke()
                self.assertEqual((result.returncode, result.stderr), (2, "wake-if-jev: classifier returned an invalid meaningful probability\n"))

    def test_bounds_classifier_excerpt_and_keeps_latest_speech(self):
        result = self.invoke(records=[
            {"type": "transcription_finished", "data": {"text": "a" * 15000}},
            {"type": "transcription_finished", "data": {"text": "The latest decision."}},
        ])
        self.assertEqual(result.returncode, 0)
        tail = self.requests[0]["body"]["state"]["pending_transcript"]
        self.assertEqual(sum(len(item["text"]) for item in tail), 12000)
        self.assertEqual(tail[-1], {"speaker": "unknown", "text": "The latest decision."})

    def test_writes_decisions_for_followers_that_capture_predicate_stderr(self):
        with tempfile.TemporaryDirectory() as directory:
            log = Path(directory) / "decisions.jsonl"
            result = self.invoke(TUPLE_JEV_LOG_FILE=str(log))
            self.assertEqual(result.returncode, 0)
            self.assertEqual(json.loads(log.read_text()), {
                "wake": True, "scores": {"meaningful": 0.9, "thought_complete": 0.8},
                "model": "jev-1.13.0", "input_tokens": 300,
            })

    def test_evaluator_reports_observed_decisions_against_labels(self):
        with tempfile.TemporaryDirectory() as directory:
            cases = Path(directory) / "cases.json"
            cases.write_text(json.dumps([
                {"id": "bug", "expected": True, "text": "The cursor loses a record.", "purpose": "Watch delivery failures."},
                {"id": "greeting", "expected": False, "text": "Hello."},
            ]))
            result = subprocess.run([str(TRIGGER.parents[1] / "scripts/evaluate-sidekick-jev"), "--cases", str(cases)],
                                    env=self.env, capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 0, result.stderr)
            summary = json.loads(result.stdout.splitlines()[-1])
            self.assertEqual(summary, {"summary": {
                "accepted_positives": 1, "accepted_negatives": 1, "held_positives": 0, "held_negatives": 0,
            }})
            self.assertEqual(self.requests[0]["body"]["state"]["purpose"], "Watch delivery failures.")


class ConnectTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="jev-test ")
        self.root = Path(self.temp.name)
        self.cli = self.root / "tuple-staging"
        self.receipt = self.root / "receipt.json"
        self.cli.write_text("""#!/usr/bin/env python3
import json, os, pathlib, sys
if '--help' in sys.argv:
    print('--wake-if --on-wake')
elif 'state' in sys.argv:
    print(json.dumps({'in_call': True, 'call': {'call_id': 'call-123'}}))
else:
    pathlib.Path(os.environ['TEST_RECEIPT']).write_text(json.dumps({'args':sys.argv[1:], 'key':os.environ.get('TYPESAFE_API_KEY'), 'recording_id':os.environ.get('TUPLE_TRIGGER_RECORDING_ID'), 'cwd':os.getcwd()}))
    sys.exit(int(os.environ.get('TEST_EXIT', '0')))
""")
        self.cli.chmod(0o755)
        self.env = {k: v for k, v in os.environ.items() if not k.startswith(("TUPLE_JEV_", "TYPESAFE_", "TUPLE_TRIGGER_"))}
        self.env.update(TUPLE_JEV_CLI=str(self.cli), TEST_RECEIPT=str(self.receipt))
        env_file = self.root / "settings.env"
        env_file.write_text('TYPESAFE_API_KEY=test-secret\nTUPLE_JEV_PURPOSE="Watch database migrations."\nTUPLE_JEV_HARNESS=codex\n')
        self.env["TUPLE_JEV_ENV_FILE"] = str(env_file)

    def tearDown(self):
        self.temp.cleanup()

    def test_launches_selected_connect_with_call_pinned_semantic_policy(self):
        result = subprocess.run([str(TRIGGER / "connect.py")], env=self.env, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        receipt = json.loads(self.receipt.read_text())
        self.assertEqual(receipt["args"][:5], ["connect", "--call", "call-123", "--harness", "codex"])
        purpose = receipt["args"][-1]
        self.assertTrue(purpose.startswith("Watch database migrations."))
        reader = purpose.split("Reader command:\n", 1)[1].splitlines()[0]
        self.assertEqual(shlex.split(reader), [str(self.cli), "--format", "json", "capture", "follow", "call-123", "--on-wake", "--wake-if", str(TRIGGER / "wake-if-jev")])
        self.assertEqual(receipt["key"], "test-secret")
        self.assertNotEqual(receipt["cwd"], str(TRIGGER))

    def test_preview_and_launch_failure(self):
        preview = subprocess.run([str(TRIGGER / "connect.py"), "--dry-run", "--call", "call-456"], env=self.env, text=True, capture_output=True)
        self.assertEqual(preview.returncode, 0, preview.stderr)
        self.assertEqual(shlex.split(preview.stdout)[:5], [str(self.cli), "connect", "--call", "call-456", "--harness"])
        failed = subprocess.run([str(TRIGGER / "connect.py")], env={**self.env, "TEST_EXIT": "7"}, text=True, capture_output=True)
        self.assertEqual(failed.returncode, 7)

    def test_pins_event_call_even_when_another_call_is_active(self):
        result = subprocess.run([str(TRIGGER / "connect.py")], env={**self.env, "TUPLE_TRIGGER_CALL_ID": "call-from-event"},
                                text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        receipt = json.loads(self.receipt.read_text())
        self.assertEqual(receipt["args"][:3], ["connect", "--call", "call-from-event"])
        reader = receipt["args"][-1].split("Reader command:\n", 1)[1].splitlines()[0]
        self.assertEqual(shlex.split(reader)[5], "call-from-event")

    def test_uses_connect_default_and_prefers_exported_key_over_env_file(self):
        Path(self.env["TUPLE_JEV_ENV_FILE"]).write_text('TYPESAFE_API_KEY=test-secret\n')
        result = subprocess.run([str(TRIGGER / "connect.py"), "--call", "explicit-call"],
                                env={**self.env, "TYPESAFE_API_KEY": "exported-test-key", "TUPLE_TRIGGER_CALL_ID": "older-call"},
                                text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        receipt = json.loads(self.receipt.read_text())
        self.assertEqual(receipt["args"][:3], ["connect", "--call", "explicit-call"])
        self.assertEqual(len(receipt["args"]), 4)
        self.assertEqual(receipt["key"], "exported-test-key")

    def test_event_launcher_preserves_staging_selection_without_copying_secrets(self):
        result = subprocess.run([str(TRIGGER / "call-capture-started")], env={**self.env, "TUPLE_JEV_DRY_RUN": "1", "TYPESAFE_API_KEY": "do-not-copy-me",
                                "TUPLE_TRIGGER_CALL_ID": "event call/ü", "TUPLE_TRIGGER_RECORDING_ID": "recording '1'"}, text=True, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        launcher = Path(result.stdout.strip())
        content = launcher.read_text()
        self.assertNotIn("do-not-copy-me", content)
        launch_env = {k: v for k, v in self.env.items() if not k.startswith(("TUPLE_JEV_", "TYPESAFE_", "TUPLE_TRIGGER_"))}
        launched = subprocess.run(["zsh", "-f", str(launcher)], env=launch_env, capture_output=True, text=True)
        self.assertEqual(launched.returncode, 0, launched.stderr)
        receipt = json.loads(self.receipt.read_text())
        self.assertEqual(receipt["args"][:5], ["connect", "--call", "event call/ü", "--harness", "codex"])
        self.assertEqual(receipt["recording_id"], "recording '1'")
        self.assertEqual(receipt["key"], "test-secret")
        launcher.unlink()
        launcher.parent.rmdir()


if __name__ == "__main__":
    unittest.main()
