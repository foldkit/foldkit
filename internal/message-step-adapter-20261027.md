# Message-only general Step producers

## Adopted API

`Definition.makeStep.fromMessage(producer)` supplies the Message to a producer
that returns an update result, a deferred Step, or a child initialization
recipe. An inline `makeUpdate` entry infers its exact Message. Applying the
returned Model-first handler evaluates the producer and applies a returned Step
to the incoming Model. Configuration stays passive and uses the existing
interpreter.

Ordinary `makeStep` retains Model-aware producers and additional operation
arguments. Cohesive mixed handlers can return results directly. Compatible
function references and zero-argument producers are supported. Extracted
Message-only producers need a precise variant annotation. An extracted callback
with an optional or defaulted variant parameter may need a required-parameter
adapter because contextual inference falls back to the owning union. This
limitation also exists in the focused helpers.

Two consumers adopt the adapter: Workspace's `handleChangedUrlStep` and
Website's `handleCompletedLoadBrowserEnvironmentStep`. Their payloads, Step
order, initialization and Commands are unchanged. The Website example-route
Step takes a slug rather than a Message and retains ordinary `makeStep`.
Other reusable Model-only Steps and direct mixed handlers retain their roles.

The Block guide, previous-preview upgrade guide, copyable handler snippet,
scaffold guidance and all three shipped skills describe the adapter. Lint
ownership recognition covers direct and imported helpers and rejects foreign
lookalikes. The skills plugin advances to `0.18.57`.

## Validation repair

Independent review found an inherited `makeStep` defect: distributive
unknown-success/never-failure validation could discard an invalid branch next
to a valid Step or result. Both forms now retain true/false results through
branch validation and require every branch to pass. Validation in the
callback's return intersection preserves contextual inference; eager validation
of the broad callback constraint had rejected valid inline producers.

Source and physically relocated declarations check exact Message and generic
payloads, Model contracts, Command requirements, OutMessages, handler
completeness, registered child operations and channel-loss rejection. Negative
cases cover invalid function/result unions, erased or impossible inputs and
outputs, unsafe refinements, foreign channels and missing registration.
Ordinary required, optional, default and rest operation arguments retain their
contracts. Dispatch context stays in `makeUpdate.withContext`; direct and
curried updates are covered.

Mutation controls were observed failing before restoration: restoring the old
validator makes four union-rejection directives unused; skipping deferred Step
application breaks the runtime cases; removing lint recognition breaks the
imported-owner acceptance case. Restored gates pass.

## Verification

- All workspace package typechecks pass, including UI, Website, Typing Game and
  every example. The scripts typecheck passes.
- Core runtime: 3,847 passed, one existing skip. Five focused adapter tests
  cover contextual inference, deferred evaluation, Model identity, Command
  passivity, declared OutMessages, dispatch context, registered child operations
  and child initialization.
- Lint plugin: 668 passed. Focused ownership cases: 38 passed. Affected source
  and application lint pass.
- Full core external emission, rejection, strict physical relocation, native
  completion, diagnostic and documentation checks pass. One existing rejection
  directive follows its relocated diagnostic; its rejection is preserved.
- Website production build and the copyable handler snippet's standalone
  strict typecheck pass.
- A freshly packed core artifact executes the public adapter with passive
  construction and both update calling forms. This is a core-only delta smoke,
  not a repeated nine-package release rehearsal.

All six compiler fixtures and their ceilings are unchanged:

| Fixture                   | Instantiation delta | Type delta | Result |
| ------------------------- | ------------------: | ---------: | ------ |
| Deep composition, 8       |             634,239 |     51,235 | Pass   |
| Wide composition, 100     |           1,330,130 |     80,276 | Pass   |
| Command requirements, 200 |             334,654 |     62,104 | Pass   |
| Wide Subscriptions, 100   |             548,398 |     24,566 | Pass   |
| Workspace composition, 4  |           2,641,963 |    228,893 | Pass   |
| Workspace composition, 8  |           4,264,711 |    276,361 | Pass   |

## Editor comparison

Baseline is the optimized preparation commit
`1fc7a5e83d3d6466866a73f739f6d0b7644e58dc`, including the #1811 fix. Candidate
is that exact archive plus the recorded implementation overlay. Independently
linked workspace packages were freshly built on both sides using matched cached
dependencies, official TypeScript `7.1.0-beta` and Node `24.22.1`.

Three fresh Workspace sessions per side use the unchanged native driver in
baseline/candidate, candidate/baseline, baseline/candidate order. All samples
and semantic validations are retained. Timing ran after builds, tests and
checkers stopped. Sources and emitted inputs remained unchanged within each
run. These are native request timings, not end-to-end Neovim or tsrs latency.

| Operation                            | Baseline median | Candidate median |
| ------------------------------------ | --------------: | ---------------: |
| Post-edit Binding hover              |        285.6 ms |         283.0 ms |
| Post-edit Binding completion         |        261.8 ms |         265.7 ms |
| First completed-Block completion     |        190.4 ms |         176.4 ms |
| Post-edit completed-Block completion |         54.2 ms |          57.9 ms |
| Error diagnostics                    |        211.4 ms |         204.4 ms |
| Clear diagnostics                    |        180.8 ms |         188.4 ms |

Ranges overlap. These bounded runs establish no material editor regression or
general speedup. Peak sampled RSS is 413.7 MiB baseline and 422.7 MiB candidate;
the 4 GiB emergency cap was not approached. Samples every 250 ms can miss short
peaks and do not establish a long-session memory bound. The existing cold-root,
declaration-scaling and rendering limits retain their earlier measured scope.

Raw logs, mutation results, source overlays, packed-artifact hash and all native
samples are retained at `/private/tmp/foldkit-message-steps-20261027`.

## Release boundary

This addition and its guidance belong to the next preview. The published Ready
snapshot remains `f3be22cfeefed437164ad614d08b16d9000e0703`. No package was
published and preview integration was not advanced. Prior Daybreak, nine-package
rehearsal and Lustre results retain their original source pins; this report does
not relabel them for the adapter. Independent review of the integrated diff
passes. Review of the exact commit is required before any push.
