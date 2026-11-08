# Preview stabilization feedback

This checkpoint follows `311a7bef9b12028071a701272861a5aad2fdeb6b` on
`codex/preview-followups-20261107`. The preceding two commits in #1922 pass
independent review, the complete local push gate, CI and Examples E2E. The
changes below still need their exact-commit review and normal push gate. They
have not been published.

The work responds to [the November 7 pilot report](https://github.com/foldkit/foldkit/pull/1655#issuecomment-6714254069).
The latest feedback refresh, November 8 at 01:40 UTC, found no newer replies
or additional preview-specific issues or PRs.

## Popover focus control

`PopoverBinding.requestCloseWithoutRestoringFocus()` closes the child without
returning focus to its trigger. The existing `requestClose()` keeps its focus
restoration behavior. Animated closing retains its leave cascade; modal closing
still unlocks scrolling and restores inert siblings. An already-closed Popover
returns no Command or OutMessage.

The focused source suites pass 51 tests. Full UI source typechecking and the
isolated UI declaration gate pass, including external acceptance/rejection,
relocated consumption and a control that removes the emitted method. The guide
and changeset describe the new operation.

## Empty Scenes and typed helpers

Scene represents an exact `null` render with a private tagless VNode. Locators
find no elements or text. Ordinary Messages can render an element and return
to empty, and root Mount disposal and subsequent remounting remain observable.
An invalid `undefined` return or Document body is still rejected.

`Scene.Step<typeof subject>` and `Story.Step<typeof subject>` let extracted
helpers name the same checked contract as their runner. The shared subject
projection retains the selected implementation, source owner, Messages,
InMessages, OutMessages, keyed Subscription paths and Scene routing. Invalid
or crossed subjects resolve to `never`; the runner retains its required update
and InMessage Context.

Twenty focused tests, the complete core source typecheck, and the full
emitted-declaration gate pass. The new external fixture verifies source,
rejected combinations, emission and source-free relocation. The active testing
guides and changeset cover these additions.

## Current compiler workload

The new `layered-composition-6` workload uses the current public Block and
Layer API in separate contract, Composition, init, update, Steps, view and
completion modules. Six child placements exercise required and optional fields,
Record storage, standard Instances, generated InMessage methods, child policies,
creation requests and ordinary and connected `combineSteps`. A routed-only
host consumes the group's OutMessage before Program completion.

The existing eight workload sources and ceilings are unchanged. All nine
workloads pass with TypeScript `7.1.0-beta` and `--singleThreaded`. The new
ceiling has no tolerance above the initial measured delta:

| Metric         | New workload delta and ceiling |
| -------------- | -----------------------------: |
| Instantiations |                      2,707,124 |
| Types          |                        336,291 |

Reducing the new instantiation ceiling by one makes the actual CLI fail on
`layered-composition-6`. The four existing driver tests also pass. These are
allocation counters, not editor latency or rendering measurements.

The final workload emits nine declaration files totaling 534,354 bytes.
Source-free consumers pass with TypeScript 7 and 6. Its identity keys require
exports so downstream declarations can name them, as the existing guidance
describes. No implementation annotations, casts or additional generic arguments
were added to achieve emission. The input manifest and receipts are retained
beside this report.

## Open performance work

Rendering, bundle size and editor latency remain work before main. Passing
compiler ceilings does not approve the remaining costs.

The prior iterative Mount traversal and direct Attribute experiments remain
excluded from production source. Their timing did not establish a reliable
rendering improvement beyond duplicated-baseline variation. A smaller gzip
artifact is a separate observation.

The retained CPU diagnostic attributes about 7 ms to Mount registration scanning
across the optimized workload. It does not explain the larger whole-workload
difference. The stable entry uses the old direct Runtime setup, while the preview
uses Block/Program construction. That is a valid end-to-end architecture
comparison, but it does not assign costs to update, view, patching or allocation.
Further paired diagnostics must check actual work counts as well as elapsed
time. Existing driver callback counts alone do not establish render counts.

A small named projection around record completion was tested and rejected. It
reduced the source-mode workload by only 26 instantiations and two types, with
no change to the eight historical source-mode controls. Those counts use source
aliases and are not the published-declaration ceiling above or an editor-latency
measurement. No framework type change was adopted.

The isolated shared-HTML-definition prototype adapts #1585 and includes the
overlapping direct Attribute-constructor mechanism from #1575. Its matched
baseline reproduces the published asset bytes. The candidate saves 12,779 raw
bytes and 4,319 naive / 4,277 optimized gzip bytes. These are one combined
candidate's savings; the PR deltas must not be added together. Full package
typechecks, 118 focused tests and emitted-signature comparison pass. Runtime
measurement remains pending, and no production change has been adopted.

## Remaining API work

The view-default refinement is queued: ordinary Element views, optional view
inputs, explicit Document kind and explicit viewless Blocks need a prototype
before migration. Connected-operation output precision remains open, with
`combineSteps`' no-loss checks preserved. Explicit exhaustive OutMessage folds
remain the convention; partial folds are not an accepted replacement.

Another publication requires approval. This checkpoint does not update the
published package manifest or PR #1655's Ready snapshot.
