# Composable update consumer options

## Scope and evidence

This consumer assessment uses baseline
`da6e55193beb693b5400c9f95777d7c9fb41f257`. The current bounded interpreter
investigation supports both an explicit child-router stage and an existing
complete update plan in the same sequence. Runtime feasibility therefore does
not choose the public spelling. Public contextual inference, declarations and
compiler/editor cost still need proof.

I read the repository and scaffold conventions; Workspace's actual root
`update/update.ts`, `update/handleChangedUrl.ts`, `composition.ts` and
`steps/issueMove.ts`; and Issue Detail's extracted `steps.ts` and `update.ts`.
I also read the saved original #1868 report and Munch Manor's linked
`settle.ts` at source `8ad6d9e7366a0268d2149ec0451b0f7a5d811c05`.
The old archived `withAfter` prototype and rejected probe were not applied or
run. This note changes no application or framework source.

Munch Manor's nine `afterMessage(before, saveWrite)` Steps compare the original
Model with successive Models to derive music, focus, rotation, run counts,
analytics and persistence. A synchronized-save Message changes the save-write
mode without suppressing the other responsibilities. The app repeats the
sequence at more than 100 handlers/folds. Its `settled` helper documents that
a nested child fold can settle twice.

Workspace's extracted handlers and shared Steps are already useful. A new
composition API should preserve those and leave `makeUpdate(record)` as the
simple default. It should not make every app author describe a routing pipeline.

## Recommendation: start with one existing complete plan

Prefer **A** as the smallest initial public surface: compose one existing full
`makeUpdate` plan with shared callbacks/Steps and additional local record stages.
Place those stages before or after the full plan. Recognize the full plan from
its owned metadata; do not require a `dispatch(baseUpdate)` wrapper.

The explicit-router design **B** is a coherent broader alternative, supported
by the same interpreter. Its benefit is distributing primary local handling
across several records with final collective completeness. Its cost is making
child routing a new authoring responsibility and teaching another completion
mode. Neither the Munch Manor workflow nor current Workspace factoring requires
that broader mode for the first release.

This recommendation is about consumer and verification cost, not a claim that
B is impossible or inherently slower. If real apps need record fragments to
jointly define the primary update, B deserves the same source/emitted/editor
proof. Do not implement two public grammars initially just because the private
interpreter can represent both.

All method names in the examples remain provisional.

## A. A full update plan is the dispatch anchor

```ts
const { makeUpdate } = ApplicationComposition

const update = makeUpdate.compose(baseUpdate, settle)
```

`baseUpdate` is the existing exhaustive plan from this Composition, including
`.withContext(...)` when already needed. It owns the normal local handler or
one automatic child delivery and its parent OutMessage fold. `settle` is an
owned shared stage. The same shared stage can appear before the full plan when
an app actually needs pre-processing; it always receives the current stage
Model. No special before/after hook family is needed.

### A Munch Manor-inspired shared update

```ts
// update/settle.ts
export const settle = makeUpdate.each((model, message, { before }) => {
  const saveWrite = Match.value(message).pipe(
    Match.withReturnType<SaveWrite>(),
    Match.when(isSyncedSave, () => 'Synced'),
    Match.orElse(() => 'Write'),
  )

  return Update.combineSteps(model, afterMessage(before, saveWrite))
})

// update/update.ts
export const update = makeUpdate.compose(baseUpdate, settle)
```

`afterMessage` and `SaveWrite` are the real extracted app responsibilities.
`isSyncedSave` denotes a domain predicate matching its existing synchronization
Message tags; it is not a new framework selector or invented Message. This
shared update preserves all nine Steps and changes only whether the final save
is written back. No selection stage or speculative preparation stage is needed
for the ordinary case.

The factory `each` supplies contextual contracts in the extracted module,
just as the current Definition helpers do for Steps. That module imports its
owning Composition's bound helper. It is consumed by update rather than
imported back into Composition's Binding construction. Removing the duplicated
settling from the old child folds also removes that dependency. Early reusable
Definition-owned Steps stay in `steps.ts`; do not move them behind graph
construction merely to use the new composition feature.

An equivalent inline callback may return an existing Step:

```ts
const update = makeUpdate.compose(
  baseUpdate,
  makeUpdate.each((_model, message, { before }) => {
    const saveWrite = saveWriteFor(message)
    return Update.combineSteps(afterMessage(before, saveWrite))
  }),
)
```

The returned Step is applied to the current Model. `saveWriteFor` is the
extracted form of the same domain match. There is no before-first callback
convention and no inspection of function arity to decide what a callback means.
A compatible existing Model-first Step can also appear directly in composition:

```ts
const update = makeUpdate.compose(baseUpdate, refreshDerivedFields)
```

A direct reference must satisfy the same source, channel and graph checks as
an inline shared callback. `each` earns its place by contextually typing new
extracted Message/snapshot-aware stages, not by forcing wrappers around existing
compatible Steps.

### Selected Messages and additional records

```ts
const update = makeUpdate.compose(
  baseUpdate,
  makeUpdate.cases({
    SucceededMoveIssue: makeFieldsStep(() => ({
      maybeNotice: () => Option.some('Issue moved'),
    })),
  }),
  makeUpdate.on(['SucceededLoadWorkspace'], () =>
    Update.combineSteps([initChildren, informRetainedIssueDetails]),
  ),
)
```

This optionally separates two real Workspace responsibilities. Remove that
work from its old base handlers if this factoring is adopted; do not perform it
twice. Current cohesive handlers should remain direct sequences when an
additional stage adds no useful separation.

`cases` is a sparse additional local record, with ordinary Model-first
handlers, exact contextual Message typing, direct Step references and direct
results. It never routes a child. `on` selects authored local variants and
narrows their exact payload union. `except` applies to all accepted dispatches
except its named local variants, deliberately including children and future
local tags not excluded. Most common updates should use a single shared
callback with a domain match, as above, rather than mechanically splitting
branches into selector stages.

Only `baseUpdate` must cover every local Message. A `cases` value is a part,
not a standalone update, even when its record happens to be exhaustive. This
is A's extra distinction: complete records dispatch; parts only transform. It
needs a clear public type/name and diagnostics for composing zero or two full
plans. It is preferable to silently stripping routing from an existing plan.

The tentative minimal vocabulary is `compose`, `each`, `cases`, `on`, and
`except`. A simple app needs none of those. Munch Manor needs only `compose`
and `each`. Do not add separate dispatch wrappers, record-completeness helpers,
pipe transformers, fluent methods, or configuration-object overloads initially.

## B. Pure record parts with an explicit child router

```ts
const update = makeUpdate.compose(
  makeUpdate.cases(primaryCases),
  makeUpdate.routeChildren(),
  makeUpdate.cases(completionCases),
  settle,
)
```

Here neither record is a full dispatcher. Exactly one router owns child
routing; the records collectively cover all local Messages at completion.
Several records may intentionally handle the same tag in sequence.

The current simple API can remain a shorthand for one router and one exhaustive
record. B is therefore compatible with the simple default. It does not require
a broad migration or duplicate routing.

Its advantage is one kind of record stage. A developer can extract handler
records by responsibility, compose them in order and obtain completeness over
the entire sequence. In Workspace, applying the loaded workspace snapshot in
one record and initializing/informing children in another retains exact payload
typing without a full record in either file. Shared Steps stay ordinary values.

Its cost is the visible `routeChildren()` instruction and its placement.
Ordinary authors now need to know that child delivery is one stage, that it
must appear once even for a leaf under a uniform grammar, and that its position
determines when a parent's current Model is read for child access and update
Context. Omitting it is a new error; placing it wrongly can be a behavior bug.
Current `makeUpdate` establishes this responsibility automatically.

That is a meaningful tradeoff, not just an unfamiliar name. The user wants
composable updates, but has not supplied a case that needs choosing router
placement independently from all primary local handling. Keep this as the
stronger alternative if collective completeness becomes necessary. Do not
claim its vocabulary is free because the private interpreter already has a
routing instruction.

## C. Always route before a local pipeline

An implicit external router that always runs before the shown stages is a
smaller implementation, but not a uniform general sequence. A first shared
stage runs before local handling and after a child's update and parent fold.
It cannot normalize a parent before child gating or context derivation.
Munch Manor's tail can work with that contract, but it does not fulfill the
broader before/after composition goal. I would not choose it as the general API.

## Common callback, snapshot and channel contracts

- Shared callbacks are `(model, message, { before }, ...context)`. `model` is
  the evolving Model at that stage; `before` is one original owner-dispatch
  snapshot. Every callback has the same calling convention, regardless of
  parameter count, and can return a validated direct result or an existing
  Step. Existing compatible Model-first Step references keep their meaning.
- Preserve exact optional/default/rest dispatch Context. The snapshot metadata
  is a reserved third parameter of the new shared-stage callback, before the
  original Context tuple. Do not silently reinterpret an existing callback
  whose third parameter expects dispatch Context. Record stages keep their
  established handler convention.
- A nested composed full plan must use the outer original snapshot when it is
  normalized into the sequence. Treating it as an opaque nested call would
  change `before` after outer pre-stages. Source identity remains authenticated.
- Admit and authenticate delivery before any user stage. Invalid child
  envelopes and Runtime-stale occurrences cannot run a new pre-stage merely
  because the old validation lived inside the later dispatcher/router.
- At the anchor/router, derive child access and update Context from the evolving
  parent Model. If a preceding stage removes the child, use normal missing-child
  behavior; the original snapshot does not keep that occurrence alive.
- Complete a child update, its recipes and parent fold once before the next
  stage. A connected operation inside a stage does not restart the parent's
  whole sequence. This is the key fix for Munch Manor's nested settling.
- Concatenate Command intents in stage order without promising ordered Runtime
  completion. Preserve actual per-Message Commands, Services, constructor
  errors and registration evidence rather than flattening to an aggregate
  update return type.
- Initially keep shared updates silent and let the existing full plan own the
  OutMessage. Additional local records must not introduce competing emissions.
  If later records may be the sole emitter for a base-silent tag, prove exact
  non-overlap per Message before accepting them. A runtime refusal of a second
  actual OutMessage protects erased callers; it cannot replace compile-time
  rejection of known conflicts or discard the first channel.
- This composes `update`. An InMessage enters `receive`; neither init nor
  receive acquires the sequence implicitly. A future receive API needs its own
  source, Context and output proof.

## What to prove next

Use the same interpreter with both A and B, but start the public inference
prototype with A's smaller grammar: an existing complete record plan, direct
shared Step reference, model-first snapshot callback, and an extra record.
Prove the real extracted `afterMessage` shape as well as inline direct results
and returned fields/Commands/combined Steps. Add `on`/`except` only after the
common callback and record stages are usable.

Check original versus intermediate Models; before/after order for local and
child dispatches; exactly one router/parent fold; nested plan flattening;
OutMessage preservation/rejection; and exact optional/default/rest Context.
Compare extracted modules and source/strict relocated consumers, then unchanged
compiler ceilings and the same post-edit hover/completion/error operations.

If B provides materially clearer extracted records with acceptable type cost,
that can justify exposing collective completeness and explicit router placement.
If A only works by hiding inference failures behind casts or broad annotations,
it has not earned a smaller surface. Neither outcome follows from the earlier
archived inference failure or from runtime proof alone.
