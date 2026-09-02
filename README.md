# Tuple Community Triggers

This repository holds a bunch of [Tuple Triggers](https://tuple.app/triggers) that are accessible via the [Triggers
Directory](https://tuple.app/triggers/directory). You can learn more by reading the [Triggers
documentation](https://tuple.app/triggers/docs).

## Quick Start

You can quickly set up a new trigger using the generator provided in this repository:

```bash
scripts/generate-trigger
```

## Tuple compatibility

Triggers that use the Tuple CLI require a build containing both the canonical
CLI at `tupleapp/app@4a587f47e6` and the `call-capture-*` event rename from
`tupleapp/app#4033`. No released build contains both yet; see
[CHANGELOG.md](CHANGELOG.md) for the publication gate.

## Contributing

Please follow the guidance outlined [here](https://tuple.app/triggers/docs/submitting-your-trigger) to submit a new
trigger to this repository.
