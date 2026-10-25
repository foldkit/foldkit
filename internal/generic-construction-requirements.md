# Generic construction requirements

## Status

The generic Service factory assessment is complete. Keep construction validation unchanged. The supported contract is a reusable factory that returns an unhandled operation and its generic Service key, followed by caller-owned `toLayer` wiring after the key identity is concrete.

## Cause

An attached generator that yields `Context.Key<Id, Service>` is inferred through Effect's iterator as yielding `Effect<Service, never, Id>`. Foldkit therefore receives the unresolved `Id` requirement rather than the more specific key value that produced it.

`ValidateConstructionRequirements<Id>` cannot establish that an unconstrained `Id` excludes Foldkit's placement-bound Command, Subscription, Mount, and ManagedResource capabilities. Those capabilities are unavailable while another handler is being constructed. Treating the unresolved conditional as accepted would remove that rejection for an `Id` later instantiated with one of those capabilities.

The same generic body cannot complete a Block whose Effects Layer requires unresolved `Id`. Block completion checks that its public requirements remain precise, and unresolved `Id` cannot establish that it is distinct from an erased requirement.

This result applies to the current unconstrained generic and Effect generator encoding. A future representation carrying explicit construction evidence could change the available design space, but it would need to preserve the same placement and requirement-precision guarantees across every handler kind.

## Supported ownership boundary

The reusable factory owns its Model, Message, unhandled Command, update, view, and composition parts. It returns the generic `Context.Key` alongside those parts. The application or host selects a concrete Service key and calls the original Command definition's `toLayer` method.

This boundary preserves:

- the exact Service identity in the handler Layer and completed Block requirements;
- compile-time rejection when the application omits the Service provider;
- construction-time rejection for known placement-bound capabilities; and
- the original Command definition identity used by Runtime dispatch.

The active Command guide shows this split-file contract. It follows the same ownership rule as other host-implemented Commands: the reusable feature declares the operation, while the code that owns the concrete dependency supplies its implementation.

## Verification

`generic-service-factory.accepted.ts` defines a generic UI factory, attaches its handler at a concrete caller, completes the Block, and asserts the exact value and Service requirements. Its emitted consumer instantiates the factory with another literal Schema and verifies that both the value and provider contracts survive declaration emission and relocation.

`generic-service-factory.rejected.ts` verifies four boundaries:

- a known Command capability cannot be used during handler construction;
- an attached handler with an unresolved generic Service identifier lacks construction evidence;
- a completed Block cannot publish an unresolved generic Layer requirement as precise; and
- the concrete Block's Effects Layer cannot run without its Service provider.

The validator has no source change. These fixtures are part of the standard direct-source, external declaration emission, rejected-wiring, and relocated-consumer harness.
