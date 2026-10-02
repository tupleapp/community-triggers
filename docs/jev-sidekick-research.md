# Classifier-gated Tuple Connect

Use one Connect session per captured call, with `capture follow --on-wake --wake-if` controlling routine context delivery. Keep relevance and thought completion as separate classifier questions. Start with `jev-1.13.0`, relevance probability at least `0.65`, and completion probability at least `0.60`.

The agent keeps its context across updates. The trigger uses the native TypeSafe HTTP API, a key supplied through the environment or a private settings file, and an optional prompt override. It needs only Python's standard library.

## API and CLI findings

The staging CLI supports `--wake-if` on `capture follow` and `capture next`. `tuple connect` accepts a purpose, which the trigger uses to pass the exact reader command. The selected agent needs a background command tool or extension that can deliver stream output during execution. The trigger relies on the agent following these instructions.

The executable protocol takes `version: 1`, `elapsed_ms`, and canonical Capture records on stdin. Exit 0 flushes, exit 1 keeps buffering, and other exits stop the reader. The CLI allows ten seconds per invocation and inherits its environment. `--on-wake` holds routine context, with exceptions for initial catch-up, direct prompts, lifecycle boundaries, and the buffer limit.

Jev's [native evaluation API](https://docs.typesafe.ai/api) accepts state plus named typed questions. A `noul` answer is a probability between 0 and 1. It is a better fit than generating and parsing a chat response. The [official JavaScript SDK](https://docs.typesafe.ai/sdk/javascript) offers inferred TypeScript answer types; it is useful for a resident extension, but adds a package installation to a portable trigger.

The [model documentation](https://docs.typesafe.ai/models) recommends pinning a version when tuning thresholds. It lists Jev 1.13 at $0.042 per million input tokens. This report's cost estimates use that rate and do not include agent turns.

## Earlier staging replay

The existing transcript-boundary eval covered seven staging calls, 239.7 minutes, and 3,227 finished transcript segments. Its refined policy made 2,516 requests, used 2,141,655 input tokens, and cost an estimated $0.089949, or about $0.0225 per call-hour. Median API latency was 322 ms.

That policy produced 472 deliveries, about 118 per hour, compared with roughly 799 potential batches per hour for pause-based Connect delivery. Its completion score was a classifier-based proxy, not independently labeled precision. A longer ceiling avoided forced splits but allowed a maximum wait of 271.7 seconds. These results support inexpensive semantic batching, but do not prove that every batch warrants an agent response.

## Labeled relevance check

Two prompt variants were evaluated through a BB Jev connection using `jev-1.13.0`. The public implementation was also tested against the live native TypeSafe endpoint.

The labeled set contains 20 authored examples and 34 five-segment windows from three staging calls. The implementing agent assigned the labels; independent human reviewers have not checked them. One window initially labeled complete was corrected after reading its unfinished final clause.

The refined completion question explicitly accounts for noisy speech recognition, fragmented sentences, and acknowledgments. At the proposed 0.65 relevance / 0.60 completion thresholds:

| Set | Accepted positives | Accepted negatives | Held positives | Held negatives |
| --- | ---: | ---: | ---: | ---: |
| Authored examples | 10 | 0 | 0 | 10 |
| Real speech windows | 5 | 0 | 5 | 24 |
| Combined | 15 | 0 | 5 | 34 |

The real-speech sample shows conservative timing: half the labeled ready windows stayed buffered. They can be delivered with later speech; this window test does not measure eventual recall. There were no observed false positives in this small sample. The thresholds were selected using these examples, so the figures are tuning results, not a held-out accuracy claim.

The standalone executable also evaluated the 20 authored examples against the live native API. It accepted all ten labeled positives and held all ten negatives. `scripts/evaluate-sidekick-jev` reproduces this check using a user's own credentials.

## Accumulating-buffer replay

The final policy was replayed over all 482 finished speech segments from the three selected staging calls, in durable record-ID order. A rejected candidate retained its pending speech; an accepted candidate reset the buffer. This approximates semantic decisions, not the CLI's full live timing, lifecycle, or asynchronous predicate behavior.

| Measure | Result |
| --- | ---: |
| Speech interval covered | 33.5 minutes |
| Classifier requests | 358 |
| Accepted batches | 51 |
| Input tokens | 286,651 |
| Estimated classifier cost | $0.01204 |
| Projected cost per call-hour | $0.0216 |
| Per-call median BB CLI round trip | 450–456 ms |
| Longest accepted wait | 135.7 seconds |

Twenty-nine speech segments remained pending across the three calls' endings. A live CLI additionally flushes at call end; the replay does not count that as a classifier approval. These results show the intended quiet behavior and its tradeoff: useful context can wait over two minutes. For work needing continuously fresh context, use periodic batching with Jev as an early wake rather than `--on-wake` alone.

## Implementation checks and staging limits

Behavior tests cover the wake/hold/error exit contract, native request payload, prompt and purpose overrides, unfinished records, direct prompts, malformed answers, timeouts, HTTP errors, bearer-credential redirect protection, excerpt limits, staging CLI selection, private env loading, and Connect error propagation.

The behavior suite, directory validator, and ShellCheck verify the implementation. Launcher checks exercise the generated shell script with a private settings file and event call ID. A staging dry run resolves the `tuple-staging` binary and includes the call-pinned reader and predicate path.

No staging call was active during preparation. A live test must establish that the selected harness starts and retains the semantic reader, receives classifier-approved output in later turns, and resumes correctly through a Capture restart. The standalone live API and classifier exit decisions have been verified; the harness's live delivery remains unverified.

The public files contain authored examples and aggregate results. Real call excerpts and detailed evaluations remain in private thread storage.
