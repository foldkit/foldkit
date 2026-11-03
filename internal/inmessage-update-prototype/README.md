# InMessage update composition prototype

Isolated at `b02e43a97d6856e24afe7ac18d54d1ce7a3647f0`. This implements attachment sections 4–5 only. It does not include the parallel unified Block/Layer prototype or broad consumer migration.

## Working API

`Composition.makeInMessageUpdate` supports the same exhaustive record, `cases`, `each`, `on`, `except`, `compose`, and Context forms as `makeUpdate`. The constructor field and direct/curried acquired entry are `inMessageUpdate`. An exhaustive record anchors completion; zero-anchor focused bundles are reusable across nesting. Shared pieces cannot emit OutMessages, and overlapping record emitters reject.

`src/update.ts` is a real extracted module. It combines an exhaustive input record, an extracted focused bundle, a connected Editor Binding operation and a final shared stage. One Model-only `increment` Step also handles a local Message. The input record contextually infers `makeFieldsStep(model, input)`, `makeOutMessageStep.fromMessage`, and `makeCommandsStep.fromMessage`; their Commands still produce local Messages. No consumer casts, `satisfies`, or extra builder generic lists are used.

`src/context.ts` independently declares ordinary Context and optional/default/rest InMessageContext. Both direct and curried input calls preserve that tuple across contextual records and focused bundles. The private native operation registry still lowers generated Binding methods.

## Implementation

- `block/delivery.ts`: the existing composer/interpreter accepts a private input mode. Input dispatch validates the decoded Schema before any callback, installs the actual operation graph, and has no child router. Its full record is the one anchor. Ordinary `makeCompositionUpdate` retains its existing declared signature and behavior.
- `hybrid/planComposer.ts`: the shared passive adapter was extracted from `hybrid/authoring.ts`. It defers both entry kinds through the same `makePlan`/`compilePlan` ownership machinery.
- `hybrid/updateComposition.ts`: an internal input view retains the original Composition/Binding identity while separating handler inputs from Command-result Messages. It reuses the same stage, context, channel, registration, coverage, and router-count checks.
- `contracted/inMessageUpdate.ts`: canonical input module and named public contracts. The separate dispatcher implementation was removed in favor of the existing composer.
- Constructed/contracted completion and facade changes select the new plan kind/property. Existing native registration, Runtime capability wrapping, acquired graph identity, and lifecycle machinery remain in place.

The passive adapter module and authoring module reference each other; the adapter functions read authoring bindings only when called after module initialization. Source-free runtime and ordinary acquisition tests cover the resulting initialization path.

## Verification

Run with Node 22 and the repository's existing dependencies:

```sh
node packages/foldkit/node_modules/typescript/bin/tsc -b packages/foldkit/tsconfig.build.json --force
node internal/inmessage-update-prototype/verify.mjs
node internal/inmessage-update-prototype/compiler-proof.mjs
```

`FOLDKIT_TS6_EXECUTABLE` can select the existing TypeScript 6.0.3 CLI. The default looks in this workspace's pnpm store. No install or framework source copy is needed by the main verifier. The compiler proof extracts the exact committed baseline into a temporary directory, builds it with the same pinned compiler, and copies the unchanged compiler workloads.

Results are summarized in `results.json`. Temporary receipts retain individual commands/logs and workload hashes:

- Full core source noEmit: pass.
- Seven new runtime cases: pass, including passive contextual bundles and validation before callbacks.
- Existing ordinary composition/delivery, input, and occurrence cancellation suites: 39 tests pass.
- Pinned TypeScript 7.1.0-beta source: pass.
- TypeScript 6.0.3 declaration emission: pass.
- Strict TypeScript 6 relocated consumer: pass (`skipLibCheck: false`, copied built package and emitted fixture only, no framework/application source fallback).
- Source-free runtime: pass.
- Five controls fail as intended: wrong Command-result union, wrong narrowed input property, foreign Composition, missing decoded validation, missing competing-OutMessage guard. Restored runtime passes.
- Additional ordinary compile negatives cover missing input tags, local input selectors, shared OutMessages, wrong Model Steps, hidden child-derived OutMessages, unregistered Binding operations, incomplete bundles, wrong plan kind, and exact public input/output signatures.

## Compiler cost

All seven existing workloads and ceilings are byte-identical to the base commit. The committed-baseline build and final candidate both pass. The first six counts are identical. Machine changes from 70,759 instantiations / 13,405 Types to 82,164 / 18,272, below 83,700 / 18,800.

Putting the exported passive runtime protocol/factory back in the rich authoring declaration reproduces 100,507 / 22,715 and fails Machine. Restoring the separate owning module restores all seven passes. This is measured declaration dependency/loading sensitivity in the pinned compiler; it is not a claim that the split reduces the semantic work of input composition. Machine's remaining headroom is 1,536 instantiations / 528 Types.

## Focused-builder lint review

Independent review found that focused update forms were missing from three
lint rules even though their full-record counterparts were recognized. One
shared authenticated callee resolver now covers both entry points, contextual
and focused records, shared callbacks, curried selectors and immutable aliases.
The real-oxlint matrix failed 42 cases before the repair. The final plugin suite
passes 798 tests, including 82 added cases and spoofing/shadowing controls.
[The focused lint receipt](../layered-constructor/inmessages/focused-builder-lint-review.json)
records the exact source, bundle, commands and original reviewer probes. Core
and UI runtime artifacts remain unchanged by that repair.

## Integration limits

The canonical integration removes the old `receive`/`makeReceive` properties and type aliases. Scoped Story/Scene facade selection uses `inMessageUpdate`; public `Story.inMessage`/`Scene.inMessage` cause helpers retain their intended names. The saved handoff patches describe the earlier prototype and retain its temporary aliases; current fixture sources and verifiers exercise the canonical API without compatibility aliases.

The prototype does not add a Runtime input queue, eager handler construction, new mutable state, or a lifecycle subsystem. Existing occurrence cancellation tests pass, but this is not a fresh browser/SSR matrix or a full keyed-input lifecycle campaign. The parallel Block.make/makeLayer work needs a manual merge of the small contracted/constructed integration hunks; applying its files wholesale would overwrite these changes.
