# Sidekick - Classifier Gated

Bring your default Tuple Connect agent into a call when Capture starts. [Jev](https://typesafe.ai) buffers routine conversation updates until they contain useful context and the latest substantive point or question is complete.

The trigger opens a terminal and runs `tuple connect` for that call, using your configured agent and model. The agent keeps its context between deliveries. Set `TUPLE_JEV_HARNESS` to choose a different agent.

The default sidekick tracks the goal, facts, constraints, decisions, and open questions. It helps participants reason through the work, catch mistakes, and choose next steps, contributing when it can move the conversation forward.

## Requirements

- macOS, Python 3.9 or newer, and the Tuple CLI on your interactive shell PATH.
- A Tuple CLI whose `capture follow --help` lists `--wake-if` and `--on-wake`.
- Capture enabled on the call.
- A [TypeSafe API key](https://typesafe.ai).
- A Connect agent that can receive a running command's output in later turns. Configure your agent with `tuple connect configure`.

Connect instructs the agent to run `capture follow --on-wake --wake-if` and keep following the call. Its tools need to deliver output while that command is running. An extension that manages call delivery itself needs its own classifier integration.

## Install

Copy this directory into the triggers folder shown in Tuple's settings, normally `~/.tuple/triggers/sidekick-classifier-gated/`. Enable triggers and Capture in Tuple. The trigger runs each time Capture starts.

From the installed trigger directory, copy the example settings to a private location:

```sh
mkdir -p "$HOME/.config/tuple"
cp .env.example "$HOME/.config/tuple/classifier.env"
chmod 600 "$HOME/.config/tuple/classifier.env"
```

Replace the placeholder `TYPESAFE_API_KEY` with your key. Add this line to your interactive zsh profile, such as `~/.zshrc`, so the terminal launcher can find the file:

```sh
export TUPLE_JEV_ENV_FILE="$HOME/.config/tuple/classifier.env"
```

You can also export `TYPESAFE_API_KEY` from your shell profile, or keep a `.env` in the installed trigger directory. Exported values take precedence over file settings. The launcher carries the settings-file path and delivery options; credentials stay in the private file or shell environment.

The default terminal is your system's handler for `.command` files. Set `PREFERRED_TERM` in the trigger's environment to `ghostty`, `iterm`, `terminal`, or `alacritty` to select one.

## Try it

During a captured call, run this from the installed trigger directory to launch immediately:

```sh
python3 connect.py
```

Use `python3 connect.py --dry-run --call <full-call-id>` to preview the command. Set `TUPLE_JEV_DEBUG=1` in your settings file to log classifier decisions; Connect prints the log's path.

Check that the agent starts the reader with `--on-wake --wake-if` and keeps following after a quiet batch. Receiving context gives the agent an opportunity to contribute; it can keep listening when it has nothing useful to add.

For staging, install into the folder shown in the staging app and set `TUPLE_JEV_CLI=tuple-staging` in your settings file.

## Classifier settings

| Variable | Default | Purpose |
| --- | --- | --- |
| `TYPESAFE_API_KEY` | Required | Your TypeSafe credential; `TYPESAFE_AI_API_KEY` is also accepted. |
| `TUPLE_JEV_CLI` | `tuple` | CLI name or path; use `tuple-staging` for staging. |
| `TUPLE_JEV_HARNESS` | Your Connect default | Optional agent, such as `codex` or `claude`. |
| `TUPLE_JEV_ENV_FILE` | Local `.env` | Path to your private settings file. |
| `TUPLE_JEV_PURPOSE` | Helpful collaborator | Role shared by the classifier and agent; described above. |
| `TUPLE_JEV_PROMPT` | Context relevant to the purpose | Replaces the relevance question and its default criteria. |
| `TUPLE_JEV_MODEL` | `jev-1.13.0` | Pinned model; re-evaluate thresholds when changing it. |
| `TUPLE_JEV_THRESHOLD` | `0.65` | Minimum probability of meaningful content. |
| `TUPLE_JEV_COMPLETE_THRESHOLD` | `0.60` | Minimum probability that the latest thought is complete. |
| `TUPLE_JEV_MIN_SECONDS` | `8` | Skip small initial buffers; 120 characters can qualify sooner. |
| `TUPLE_JEV_TIMEOUT_SECONDS` | `7` | HTTP timeout, limited to 8 seconds under Tuple's 10-second predicate deadline. |
| `TUPLE_JEV_API_URL` | `https://api.typesafe.ai/v1/systemone` | Full endpoint implementing the [TypeSafe request and response contract](https://docs.typesafe.ai/api). |
| `TUPLE_JEV_DEBUG` | Off | Set to `1` to create a decision log in the session's temporary directory. Connect prints its path. |
| `TUPLE_JEV_LOG_FILE` | Unset | Optional JSONL log path; records scores and token counts, omitting transcripts and keys. |

The default relevance question asks whether `pending_transcript` contains context that helps the assistant carry out `purpose`. Facts, observations, constraints, proposals, decisions, questions, and next steps can qualify. The purpose determines relevance for technical and nontechnical calls alike.

The completion question asks whether the latest substantive utterance expresses an understandable point or question. Short answers, sentence fragments, and trailing acknowledgments can qualify. An unfinished cause, comparison, proposal, or condition keeps buffering. The topic can continue after a delivery.

Set a purpose to focus the sidekick on your call's goal. The default relevance question uses that purpose:

```dotenv
TUPLE_JEV_PURPOSE="Help us plan the office move. Track dates, vendors, access constraints, and owners."
```

Set `TUPLE_JEV_PROMPT` when you want a different relevance question. It replaces the default question and its yes/no criteria; the completion question still applies.

Jev probabilities are estimates. Try representative calls and label accepted and delayed examples before choosing thresholds for your workflow. The defaults favor quiet delivery and can postpone useful updates.

## Delivery and failures

Tuple invokes `wake-if-jev` with a JSON object containing `version: 1`, `elapsed_ms`, and `records`. Exit `0` asks for delivery, exit `1` retains the buffer, and exit `2` reports a failure and stops the reader. The trigger makes one HTTP request per eligible candidate, with no hidden retry loop. Authentication errors, timeouts, and invalid probabilities stay visible as errors.

`--on-wake` holds routine live output. Initial catch-up, direct chat, lifecycle boundaries, and Tuple's 1 MiB buffer limit can still deliver without classifier approval. A rejected candidate stays buffered; it is not discarded. The classifier sees up to the latest 12,000 characters of finished speech, while Tuple retains the full selected records for delivery. These excerpts are sent to your configured classifier service.

The trigger starts a session each time Capture starts. Restarting Capture can open another session; close the prior one first if you want only one. An existing session is instructed to keep following through Capture restarts until call end.

Custom endpoints must implement the TypeSafe request and response contract linked above. The predicate validates answer types and probability ranges.

## Evaluate your classifier

From a checkout of this repository, run the public labeled examples against your configured classifier:

```sh
TUPLE_JEV_ENV_FILE=/absolute/path/to/your.env scripts/evaluate-sidekick-jev
```

This makes paid API requests. Supply `--cases /path/to/labeled.json` to evaluate your own examples; each entry takes `id`, `expected` (boolean), and either `text` or a complete wake-if `request`. An optional `purpose` sets the role for that example. Use `--cases tests/fixtures/sidekick-jev-boundaries.json` from the repository root to check short answers, incomplete speech, and custom-purpose relevance.

The public [labeled examples](https://github.com/tupleapp/community-triggers/blob/main/tests/fixtures/sidekick-jev.json) cover completed technical updates, unfinished speech, social chatter, and a request to manipulate the classifier. Research notes and evaluation limits are in [the research report](https://github.com/tupleapp/community-triggers/blob/main/docs/jev-sidekick-research.md).
