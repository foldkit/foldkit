# Stale Async Pruning

Code: `staleAsyncPruning.test.ts` (an autosave editor: `Viewing | Editing |
Saving | SaveFailed`).

## The problem this solves

The classic Elm-architecture bug is a completion Message arriving for work
the user already abandoned. A `SucceededSave` lands after the user cancelled,
navigated away, or kicked off a retry, and a `Match` branch in a hand-written
`update` happily writes the stale result into the Model. The usual defense is
a request id check repeated inside every async result branch, and the bug
returns whenever someone adds a branch and forgets the check.

## What the machine buys

Two distinct layers of pruning, both visible in the table rather than
scattered through `update`:

1. Cross-state staleness is pruned by topology. `Saving` is the only state
   with an edge for `SucceededSave`, so a success arriving in `Viewing`
   (after a cancel) cannot be handled by any code path. There is nothing to
   forget. The test asserts the `step` result is
   `Ignored { stateTag: 'Viewing', messageTag: 'SucceededSave' }`, which is
   exactly the log line you want in development.
2. Same-state staleness (a success from attempt 1 arriving while attempt 2
   is in flight) still needs a generation token, but the check lives in one
   place: a `when` guard comparing `message.attempt` to `state.attempt`. The
   guard list has no `otherwise`, so a mismatched attempt is `Ignored`,
   observable, and provably cannot reach the build function.

A third effect falls out for free: `ChangedDraft` has no edge from `Saving`,
so edits during a save are dropped explicitly rather than silently merged
into a Model that is about to be overwritten. Whether to drop or buffer them
is a product decision, but the table forces the decision to be made and makes
the current answer readable.

## Honest limits

- The machine does not eliminate the generation token; `attempt` still lives
  in `Saving` and rides along on the result Messages. What it eliminates is
  the scattering of the comparison.
- Dropping `ChangedDraft` during `Saving` is the simple policy. Buffering
  keystrokes during a save would need an extra field on `Saving` and a
  self-edge, at which point the table grows like any other code.
- The fake `SaveDraft` Command resolves synchronously for the test. A real
  one is an RPC, which needs the services channel (`R`) the spike has not
  added yet.
