# Granola Meeting Notes

A [Tuple](https://tuple.app) trigger that opens a fresh [Granola](https://granola.ai) note when a call connects.

## How it works

On `call-connected`, the script runs:

```sh
open "granola://new-document?creation_source=tuple"
```

Granola brings itself to the front with a new note. From there it captures the meeting audio and you take notes as usual.

## Prerequisites

- macOS
- [Granola](https://granola.ai) installed and signed in

## Installation

Drop this directory into your Tuple triggers folder:

```sh
~/.tuple/triggers/granola-meeting-notes/
```

Make the script executable:

```sh
chmod +x ~/.tuple/triggers/granola-meeting-notes/call-connected
```

The trigger fires on the next call.

## Publishing

To submit to [`tupleapp/community-triggers`](https://github.com/tupleapp/community-triggers), fork the repo, copy this folder into `triggers/granola-meeting-notes/`, and open a PR. See [Submitting a trigger](https://docs.tuple.app/triggers/submitting-a-trigger) for the review checklist.
