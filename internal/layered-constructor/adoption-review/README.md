# Final contract boundary review

This review changes no framework APIs. It checks ordinary handler provisioning and the distinction between authored transition channels and the independent public contract.

## Ordinary externally supplied handlers

`hostContract.ts` declares the original omitted-handler Command, Schema contracts, and portable init/update/view. `hostProvider.ts` supplies its handler through the original `Read.toLayer(Effect.gen(...))`, retaining a typed construction failure and separate constructor/invocation Services. `host.ts` lists the original host-owned Command and selects that recipe through the ordinary descriptor's `provideHandlers` method.

The proof checks exact Layer failure and Service channels, pure Story acquisition without handler mocks, public Program execution, and typed failure when the acquired handler Layer builds. The Program stays pending until both ordinary Services are supplied through its public provisioning API. Program startup retains its existing `Effect<void>` runtime contract; handler-Layer failure typing is checked at the Layer boundary.

Wrong original providers and missing Services are rejected in source and emitted consumers. An ordinary independent implementation may retain unresolved `hostHandlers`, but its providers must be selected before acquisition. The earlier assessment that ordinary descriptor parity could be deferred is superseded. The focused runtime and split-file source/declaration proof now lives in `packages/foldkit/src/experimental/contracted/hostHandlers.test.ts` and `packages/foldkit/declaration-tests/host-handlers/`.

## Per-Message channels

`channels.ts` compares native and portable authored updates. Both callable update results aggregate their OutMessage and Command requirements. Their `OperationOutputs` evidence retains exact per-tag channels: a silent Message needs no Command Service, an announcement carries only its OutMessage, and an audit carries its original Command handler requirement.

An independent acquired facade deliberately has `updates: {}` and exposes its declared aggregate update contract. It cannot infer implementation-specific per-tag facts across that independent boundary. Explicitly declared public operations retain precise checked channels. The proof verifies all three distinctions through source, declaration emission, and a strict relocated consumer.

The copied control removes `OperationOutputs` evidence from the built package. It must fail on the emitted per-tag channel assertions; restoring the evidence must pass. No canonical package artifacts are mutated.

## Running the proof

Build the current Foldkit and Vite plugin artifacts first, then run with a supported Node version:

```sh
node internal/layered-constructor/adoption-review/verify.mjs
```

The verifier uses the existing UI test dependencies, copies only built Foldkit artifacts for the relocated consumer, and enables `skipLibCheck: false`. Generated files and dependency links are ignored. `verification/latest.json` records the latest result. Source, all four runtime tests, emission, relocation, the rejected copied control, and restored relocation pass.

## Reviewed paths and integration findings

- `block/makeDefinition.ts`, `block/makeNamespace.ts`, and `block/public.ts`: native dispatch remains available; independent declarations require key and Init contracts.
- `experimental/contracted/{contract,runtime,effectsContract,family}.ts`: declared bounds, checked completion, original provider selection, and family host handling.
- `experimental/{constructed/runtime,constructed/contract,hybrid/authoring}.ts` and `block/operationOutputs.ts`: private graph wrapping, passive plans, aggregate calls, and exact operation evidence.
- `block/runtimeCapability.ts` and `runtime/{rootBlock,program,programConstruction,resourceProvider}.ts`: selected native graphs, occurrence authority, ordinary providers, and public startup.
- `packages/foldkit/package.json`: the review initially found five research export paths (`hybrid`, `constructed`, `layered`, `layered/testing`, and `contracted`). They expose competing authoring APIs and need an explicit publication decision during final integration. Canonical consumers use Block, Story, and Scene.

The UI kernel assertions identified broadened Combobox operation declarations during adoption. The owning implementation corrected those declarations; the original precise open/close/select assertions remain. All 68 UI test files and 1,349 tests pass, with the full UI source check and lint for the seven migrated global files also passing.
