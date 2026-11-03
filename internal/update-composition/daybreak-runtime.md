# Occurrence cancellation and buffered dispatch review

This follow-up covers findings 1 and 6 in the authorized Daybreak review of
`db69206779`. It does not replace the other findings or the final integrated
verification.

## Reproduction

The new `runtime/occurrenceCancellation.test.ts` fixture runs a constructor-authored
keyed child through an actual Program. The child's OutMessage can remove its own
occurrence while its update also returns a Command. Another case removes a child
while its Command is waiting. The view case queues removal, same-key recreation,
and an old child emission during a render, then checks the replacement Model.

A temporary copy of HEAD `da6e55193beb693b5400c9f95777d7c9fb41f257` with the initial
five tests reproduced four failures. The four relevant runtime source files were
byte-identical to Daybreak's frozen input. The observed original failures were:

- A removed child's deferred Command started.
- A pending child Command remained alive after removal.
- Its cleanup defect was consequently not reached at retirement.
- A buffered old child Message changed the replacement child's count to 1.

The review's particular inactive-authority crash was **not** reproduced in this
normal Program path: native graph lowering unwraps child facades. This evidence
supports a cancellation ownership defect rather than claiming the exact original
crash scenario was demonstrated.

## Changes

- `runtime/runtime.ts` checks the captured occurrence before its deferred fork.
  The Command and result delivery remain interruptible. Cause handling runs
  outside that interruptible region, ignores only pure interruption, and still
  reports genuine defects, including defects raised during cleanup.
- `runtime/compositionRuntime.ts` captures the target occurrence Scope rather than
  the Program Scope. Removing a child now interrupts its pending Commands.
- `runtime/renderer.ts` forwards optional currentness callbacks to both queue
  entrypoints, preserving the existing queue-time validity check.
- The existing keyed lifecycle test now expects `['old']` to be interrupted at
  removal. Its sibling completion, resource cleanup, stale dispatch, reused-key
  delivery, Mount and constructor-sharing assertions remain intact.

No constructed wrapper, public API, transition, or authority-authentication
changes are part of this cancellation fix.

## Verification

Node 22.22.3 was used. No package build or dependency change was performed.

From `packages/foldkit`:

```sh
node node_modules/vitest/vitest.mjs run \
  src/runtime/occurrenceCancellation.test.ts \
  src/runtime/keyedComposition.test.ts \
  src/runtime/messageProcessing.test.ts \
  src/runtime/childOrigin.test.ts
```

All 23 tests pass. The six new cases cover same-transition self-removal, pending
cancellation and replacement, parent Command isolation, active Command defects,
retirement finalizer defects, and buffered same-key replacement. The existing
keyed test also verifies a sibling's pending Command still completes.

Focused ordinary lint and formatting pass. Core source `tsc --noEmit` and focused
Effect lint with warnings denied passed on the cancellation snapshot. The final
repeat encountered concurrent, unrelated source changes in `graphTopology.test.ts`
and `runtime/start.ts`, and a reset installed Oxlint patch (`Unknown plugin:
effecttsgo`). No cancellation files have diagnostics. The integrated verification
must rerun these two gates after those changes settle. Receipt paths:

- `/tmp/foldkit-lifecycle-daybreak-baseline-red.log`
- `/tmp/foldkit-lifecycle-daybreak-focused.log`
- `/tmp/foldkit-lifecycle-daybreak-source.log`
- `/tmp/foldkit-lifecycle-daybreak-lint.log`
- `/tmp/foldkit-lifecycle-daybreak-effect-lint.log`

Purposeful mutations run only in a temporary source copy. They restore the
Program Scope, crash on pure interruption, discard the buffered dispatch guard,
remove the cause-handling mask, or suppress every retired occurrence's failure.
Each must fail its corresponding regression; the restored copy must pass.
Results are recorded in `/tmp/foldkit-lifecycle-daybreak-controls/results.json`.
These are local receipts, not portable published artifacts.

The microtask currentness check is defense in depth with the occurrence Scope:
removing that check alone did not bypass the already-closed Scope in this test.
The original source reproduction demonstrates why work must not start after
retirement without either protection.
