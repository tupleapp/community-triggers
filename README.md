# Tuple Community Triggers

This repository holds a bunch of [Tuple Triggers](https://tuple.app/triggers) that are accessible via the [Triggers
Directory](https://tuple.app/triggers/directory). You can learn more by reading the [Triggers
documentation](https://tuple.app/triggers/docs).

## Quick Start

You can quickly set up a new trigger using the generator provided in this repository:

```bash
scripts/generate-trigger
```

## Capture event transition

Triggers that run when call capture starts or completes temporarily ship two event
executables. `call-transcription-*` preserves compatibility with the current stable
Tuple app and CLI. `call-capture-*` targets the renamed events and canonical Capture
CLI in the upcoming release.

The two files intentionally have different implementations during the transition.
Keep the legacy file and any helper it invokes on the old CLI contract when
updating the Capture version. We will remove the legacy files and frozen helpers
after the new app release has rolled out.

## Contributing

Please follow the guidance outlined [here](https://tuple.app/triggers/docs/submitting-your-trigger) to submit a new
trigger to this repository.
