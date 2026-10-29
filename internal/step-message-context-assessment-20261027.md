# Inline general Step Message inference assessment

The user subsequently approved reassessment against the October 28 implementation.
The [current follow-up](step-inference-unhover-20261029.md) owns that result.
The measurements and decision below retain their original October 27 scope.

## Decision

Keep the current public typing for this preview. Plain inline `makeUpdate`
handlers and inline `makeStep.fromMessage` producers infer their exact Message.
A Model-aware general `makeStep` callback still needs a precise Message variant
annotation. Extracted producers need an independent parameter contract.

The investigation starts from `abc1a0c1b6ad2ee9727a3e22a76ca2daf5e5f39b`.
It proves that an inferred form is possible in a small consumer, and that a
sound-looking encoding passes the exercised source rejection checks. It does
not establish that every encoding is too expensive or that TypeScript cannot
support the desired syntax. No experimental framework source, proof tests,
budget revision or consumer annotation removal is adopted.

## Encodings and outcomes

The baseline `DefineStep` infers a generic argument tuple and output, validates
both, and wraps its complete `DefinedStep` return in `NoInfer`. That barrier
prevents the handler record from supplying the tuple's exact Message.

| Encoding                                                                                                          | Observation                                                                                                                                                                                                                                              | Disposition |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Remove the complete return's `NoInfer`                                                                            | Exact Model/Message probe passes, including ordinary optional/default/rest operation arguments. Existing connected Steps in `Update.combineSteps` lose their output/evidence inference; full core checking fails.                                        | Rejected    |
| Preserve `NoInfer` around each output-derived type slot, leaving the tuple inferable                              | Small consumer passes, but existing unary, connected and registration contracts fail in the full core check.                                                                                                                                             | Rejected    |
| Add a Message-aware overload before the original generic signature                                                | Exact inline inference works. Three-argument operations lose contextual Model typing, and an existing explicit-any rejection becomes unused.                                                                                                             | Rejected    |
| Put the generic overload first, or partition overloads by arity                                                   | The Message remains unknown or contextual callback parameters become any.                                                                                                                                                                                | Rejected    |
| Add an optional function-valued context hint to the original protected return and the record's contextual handler | Small exact-inference probe and full existing core source checking pass. The hint carries arguments only, adds no callable/runtime path, and retains the complete protected output and graph contracts. The larger compiler fixture exceeds its ceiling. | Not adopted |
| Restrict the hint to one inference map and erase it for empty or non-required tuples                              | Source acceptance/rejection and production declaration build pass for the required-tuple variant. Compiler complexity remains above the larger fixture's unchanged type ceiling.                                                                         | Not adopted |
| Give the Message overload a variadic contextual callback to accommodate existing operation arity                  | The exact inline Message remains unknown in the probe.                                                                                                                                                                                                   | Rejected    |

The strongest candidate uses the existing `DefineStep` return intersected with
an optional unique-symbol property typed as an argument-taking function. The
first contextual mapping of `AuthoredUpdateCases` supplies the same property
with the tag's exact Message. A function-valued hint preserves ordinary
fewer-argument handler compatibility; a tuple-valued hint would reject unary
Steps. It has no runtime field or additional callable overload.

The [exact required-tuple hint patch](step-message-context-20261027/required-context-hint.patch)
applies to the assessment baseline. The [source proof patch](step-message-context-20261027/source-proof.patch)
adds contextual Model/Message checks, generic factories, dispatch context,
Command requirements, selected completed-operation OutMessages, connected
operations and relocated-consumer fixtures. The source fixtures reject inline
any/never/narrowed or wrong-tag Messages, erased results, missing registration
and connected OutMessage loss. The ordinary update's visible return remains
aggregate; selected completed operations retain per-Message contracts.

The source acceptance/rejection check passes for that candidate. The production
package declaration build also passes. Strict physical declaration relocation,
runtime tests and editor timing were not run after the compiler gate failed.
Do not describe those unexecuted gates as verified. The original source probe
fails against the baseline and succeeds with the hint, establishing that it
exercises the requested inference difference.

## Unchanged compiler comparison

Official TypeScript `7.1.0-beta`, the same checkout and dependency graph, freshly
built package declarations and all six unchanged fixtures and ceilings are used.
The retained [baseline](step-message-context-20261027/compiler-baseline.log)
and [candidate](step-message-context-20261027/compiler-required-hint.log) outputs
contain the complete measurements.

| Fixture                   | Baseline instantiations | Candidate instantiations | Baseline types | Candidate types | Result                     |
| ------------------------- | ----------------------: | -----------------------: | -------------: | --------------: | -------------------------- |
| Deep composition, 8       |                 634,239 |                  634,598 |         51,235 |          51,339 | Pass                       |
| Wide composition, 100     |               1,330,130 |                1,330,489 |         80,276 |          80,380 | Pass                       |
| Command requirements, 200 |                 334,654 |                  335,013 |         62,104 |          62,208 | Pass                       |
| Wide Subscriptions, 100   |                 548,398 |                  548,398 |         24,566 |          24,566 | Pass                       |
| Workspace composition, 4  |               2,641,963 |                2,527,110 |        228,893 |         206,265 | Pass                       |
| Workspace composition, 8  |               4,264,711 |                4,405,310 |        276,361 |         304,002 | Fails type ceiling 280,523 |

These are compiler-complexity counters, not editor latency or memory timings.
They do not prove a proportional editor slowdown. They do establish failure of
the current required compiler gate, so the annotation is retained rather than
raising that gate during stabilization. The measurements also show why a small
isolated inference example is insufficient evidence for framework adoption.

## Review and restoration

Independent review finds no concrete safety blocker in the optional callable
hint and specifically calls for inline any/narrowing, unary connected-handler
and emitted-contract checks. The inline any/never/narrowing/wrong-tag probes all
reject. The reviewer does not certify the failed compiler gate or unexecuted
relocation/editor checks.

All seven changed framework/proof files are restored byte-for-byte from the
baseline, and the core package is rebuilt from that restored source. The
follow-on shared-Step file convention is independent of this typing experiment.
It changes application organization and guidance, not the `makeStep` API.

Full prototype logs and the independent design discussion remain at
`/private/tmp/foldkit-step-context-20261027`; the source probe is at
`/private/tmp/foldkit-step-message-context-20261027`. The tracked patches and
counter results preserve the useful approach without relying only on local
paths. No external message or experimental Gist publication is performed.
