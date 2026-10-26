# Composition compiler diagnostics

## Scope

This follow-up covers compiler errors reported while authoring connected Steps and completing a Block Composition. It preserves the existing runtime, graph evidence, service requirements, source types, and emitted declaration contracts.

## Adopted changes

- `GraphCapability` carries a required descriptive type-only property. Applying a connected Binding Step to a plain Model now names the two valid repairs: run it inside the registered Composition or defer it with `Definition.makeStep`.
- The data-first fallback for `Update.combineSteps` anchors its Step input to the actual input Model. An OutMessage-producing Step now fails on its incompatible `outMessage` channel instead of degrading to an `unknown` function-parameter error. The data-last form retains the same rejection.
- `prepareBlock` keeps every existing successful overload in its existing order. A final diagnostic-only overload validates malformed concrete implementation objects and returns `AssemblyDraft<never>`. Invalid calls still fail at the call site; the return type is not a successful escape. This reports distinct messages for primary views not authored by the same `Composition.makeView` and handler requirements omitted from both the local `EffectsLayer` and `hostHandlers`.
- Invalid init results continue to fail on the missing `model` field or the incompatible `outMessage` channel. No guide-only wording is presented as a new compiler diagnostic.

The broader isolated prototype that moved the inferred implementation overload was rejected. It preserved the five compiler counts but lost a generic Subscription registry from the emitted `generated-dispatch` consumer. The terminal diagnostic-only overload does not participate in successful inference and avoids that regression.

## Verification contract

`packages/foldkit/declaration-tests/compiler-diagnostics.fixture.ts` defines one split child and parent Composition. The accepted consumer covers direct, data-first, data-last, and Definition-deferred connected Steps, plus local and host-owned handler wiring. The intentionally invalid consumer has no `@ts-expect-error` directives; the dedicated check requires TypeScript to fail and asserts these source and relocated emitted fragments:

- the connected-Step Composition or `Definition.makeStep` repair;
- the incompatible `outMessage` channel;
- the primary `Composition.makeView` ownership repair;
- the local `EffectsLayer` or explicit `hostHandlers` repair;
- the missing init `model` field;
- the incompatible init `outMessage` channel.

The emitted acceptance check also rejects `AssemblyDraft<never>` in the valid consumer declaration. The existing external declaration harness retains separate `any` and `never` producer guards for `Block.assemble` and exercises generic views, Subscription registries, Scene typing, source rejection, declaration emission, and relocated consumption with `skipLibCheck: false`.

## TypeScript boundary

An implementation value deliberately erased to `any` or `never` can enter older shape-specific `prepareBlock` overloads. That behavior predates this diagnostic fallback; the fallback neither adds nor repairs it. Concrete malformed implementation objects remain rejected where they are written. Closing deliberate `any` erasure would require guards across the successful overload family and is a separate API compatibility and compiler-cost change.

Compiler output can still include the surrounding structural type after the descriptive property. The assertions require the actionable fragment rather than an exact full diagnostic string, which varies with TypeScript display truncation.
