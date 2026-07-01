# Per-Row Sync (One Machine, Many Instances)

Code: `rowSync.test.ts` (`Synced | Editing | Saving | Conflict` per row,
mapped over a table of rows).

## The problem this solves

Per-entity lifecycle state (save status per row, upload status per file,
membership status per participant) is the state that most reliably smears
across a hand-written `update` over time. Each new message handler
re-implements "find the row, check what state it is in, decide whether this
applies", and the conflict-handling rules end up duplicated and slightly
different per branch.

## What the machine buys

This is where the cost argument flips. The fixed costs of the table
(vocabulary, two-stage define) are paid once, while every instance gets the
benefits:

- The machine is defined once and applied per row with a plain
  `Array.map`; `transition` is just a function. The app-side glue is the
  ~15 line `applyRowMessage` helper: find the row, transition its `sync`
  field with `evo`, and lift the row's Commands into the table's Message
  with `Command.mapMessages` so results route back to the same row. That is
  the standard Submodel wiring, with the machine sitting where the child
  `update` would.
- Routing correctness is testable end to end: the test runs the emitted
  `SaveRow` Command and asserts the result comes back as
  `GotRowMessage({ rowId: '2', ... })`, already addressed to the row that
  initiated it.
- Per-row staleness is pruned the same way as in the autosave example: a
  `SucceededSave` aimed at a row that is `Synced` is a no-op for that row,
  with no per-branch guards in the app's `update`.
- Analysis amortizes. `unreachableStates` and `deadTransitions` run once
  against the definition and certify the lifecycle for every row that will
  ever exist, which no amount of per-instance testing of a hand-written
  `update` gives you.
- The conflict flow (`Conflict` with keep-mine re-saving against the new
  baseline versus take-theirs adopting the server value) is four edges, and
  both resolutions are forced to produce a legal next state.

## Honest limits

- Message routing by row id is app code, not machine code; the machine knows
  nothing about collections. A real module might ship a `forEntity` helper,
  but the spike deliberately keeps the machine ignorant of where its state
  lives.
- All rows share one Message union, so a row's messages must be wrapped
  (`GotRowMessage`) to carry the id. That is ordinary Foldkit practice but
  worth naming as a requirement.
- There is no cross-row coordination (for example "only one row may be
  Editing"). That is parent-level state and belongs in the parent's
  `update`, not in the per-row machine.
