# Update composition type proof

These probes exercise the production Composition update API. `authoring.ts`
projects each real Composition's `makeUpdate` type and re-exports the production
channel helpers. It does not declare a parallel authoring surface.

## Tested surface

Keep the existing exhaustive `makeUpdate(record)` as the ordinary entry point.
The extension creates Composition-owned, passive stage values and
returns an ordinary completed Update Plan only after composition is checked.
One existing complete update supplies the routing anchor. Focused bundles can
be composed and extracted before that anchor is supplied.

```ts
const makeUpdate = makeComposableUpdates(ApplicationComposition)

const inputs = makeUpdate.cases({
  ChangedCount: makeFieldsStep((_model, { count }) => ({
    count: () => count,
  })),
})

const focused = makeUpdate.compose(
  inputs,
  labelCases,
  completionCases,
  makeUpdate.except(['ChangedLabel'])((model, message, { before }) => ({
    model: modifyFields(model, {
      label: () => `${before.label}:${message._tag}`,
    }),
  })),
)

const update = makeUpdate.compose(baseUpdate, focused)
```

Zero-anchor bundles remain noncallable stage values and cannot complete a Block.
Exactly one already exhaustive owned Update Plan completes the composition.
Nested focused and completed compositions retain their anchor count and exact
per-tag channels. The extension does not expose an explicit routing stage.

Shared callbacks receive the current Model, original Message, explicit
`{ before }` snapshot, and the declared Context tuple. A returned unary Step
receives the current Model. A Model-only Step can be supplied directly. Shared
stages are silent, including the parent policies of connected operations.

`on(tags)(producer)` selects local facts. `except(tags)(producer)` excludes
those local facts from the full dispatch union, retaining child deliveries.
Neither replaces the anchor's exhaustive local handler coverage; adding a new
local Message still requires its case in the anchor.

## What the type proof establishes

- Sparse records reuse `AuthoredUpdateCases` and infer exact Message payloads.
  They retain the native raw/recipe, Command, OutMessage and evidence validators.
- Completed updates require exactly one full anchor. Sparse parts and focused
  bundles cannot be supplied to checked Block completion as completed updates.
  Nonempty zero-anchor compositions remain reusable focused bundles.
- Outputs remain rows of `[tag, OutMessage, requirements, registration]`.
  Silent cases remain silent; a Command-producing case retains its exact original
  handler requirement. A handler Layer still requires its ordinary Storage
  Service independently of graph construction.
- Disjoint emitting cases compose. Two potentially emitting stages for the
  same tag are rejected. Shared callbacks cannot emit, even through a connected
  parent policy or an invalid `combineSteps` policy discard.
- Callback parameter contracts remain contravariant after contextual inference.
  A callback restricted to one variant cannot stand in for a total shared
  callback. Incorrect Model fields, payloads, Command results, invented selector
  tags, erased results, never results and foreign graph operations are rejected.
- Shared callbacks see generated child envelopes with their precise child
  payload. Selectors cannot author handlers for generated envelopes.
- Required, optional, default and rest Context are retained. Composition uses
  the one declared tuple; it does not merge or concatenate stage Contexts.
- `placements.ts` moves the same complete sparse builder expression between
  inline, named local and imported forms and checks the resulting rows agree.

The three newly exported delivery aliases are internal only:
`AuthoredUpdateResult`, `ValidateAuthoredUpdate`, and
`ValidateMixedAuthoredOutput`. Their implementations are unchanged.

## Inference findings and limits

1. A single shared signature inferred only through its output fails for a direct
   `makeFieldsStep` over a union. A reverse-mapped one-element argument tuple,
   intersected with an unknown-return contextual callback, accepts that helper
   while preserving exact post-inference validators. The unknown contextual
   return is an inference hint, not the accepted output contract.
2. A selected payload-reading focused helper needs reverse output inference for
   a single tag. A selected Model-only helper over several tags uses the tuple
   inference path. The prototype uses those two patterns and binds selection
   before the callback through currying. This extra inference machinery is a cost
   to assess before public adoption.
3. Direct raw conditionals combining an applied connected recipe with an
   applied canonical no-op now pass in `each`, selected and excluded callbacks.
   `contextGraph.ts` also checks that branch with required, default and rest
   Context. A raw unregistered result mixed with a connected recipe still fails
   the original mixed-output validator.
4. One ordinary shared callback has one inferred return union. Its requirements
   apply conservatively to every selected tag. Use record stages when different
   tags need distinct result channels; inspecting `_tag` inside a callback does
   not establish dependent per-tag return types.
5. Capturing the old callable through `infer MakeUpdate` produced malformed
   declarations containing misplaced `infer` types. Reconstructing the existing
   named `MakeUpdatePlan` alias preserves its default overloads and emits usable
   declarations. No consumer annotation was introduced to hide this failure.
6. Source ownership rejects different nominal Definitions. Runtime authentication
   still establishes original Composition identity; structurally identical
   objects do not become authenticated merely through this type proof.

## Verification

From the worktree, with Node 22 on `PATH`:

```sh
node internal/update-composition/types/verify.mjs
```

The script performs source checking, declaration emission, a strict
`skipLibCheck: false` source-free consumer check, two copied declaration
mutations, and a restored consumer check. It asserts the relocated consumer did
not read original Foldkit or probe source. The copied declarations and consumer
use one physical Effect 4.1.0 dependency. No rejected call is executed.

`verification/results.json` records commands and exit codes. Removing exact
Command requirements fails a type equality with TS2344; removing the per-tag
emitter conflict check makes its negative directive fail with TS2578. Both
mutations are confined to copied declarations and restored afterward.

The runtime and compiler results are recorded separately. The verification
script mutates copied production declarations, verifies the expected rejection,
and restores them. Its receipt records the exact production authoring hash.
