# Construction, Runtime, and testing review

Reviewed the current isolated integration on November 1, 2026. This was an independent read-only review outside the alternate-view and shared-family encoding work. No library files were changed and no broad suite was rerun for this review.

## Result

No additional concrete correctness blocker was found in the reviewed construction, Runtime, capability, and testing paths. This is a bounded review of the current implementation; it does not establish support for every possible external provider or graph shape.

## Provisioning and host lifetime

- `runtime/programConstruction.ts` performs runtime-id and hydration preflight before acquiring shared Services or the executable graph. Flags resolution stays deferred until native Runtime provisioning.
- Shared Services, graph construction, and late runtime providers use the same MemoMap. The shared Context is reused when building late providers; ordinary resourceful Layers retain one acquisition under the host Scope.
- Runtime providers are built after the native Runtime allocates ManagedResource refs. The shared provider phase cannot obtain those refs implicitly. Repeated `provide` calls retain ordinary `Layer.provideMerge` dependency direction.
- `programConstructionTypes.ts` preserves separate constructor and execution requirements. Conditional provider outputs satisfy requirements only when present in every alternative; possible inputs remain required. Runtime outputs cannot close constructor requirements.
- Constructor/provider defects unwind the enclosing scoped host acquisition. Native Runtime still owns occurrence cleanup and its established failure behavior. Server rendering scopes graph construction and does not build the handler Layer.

## Graph and occurrence identity

- Root acquisition accepts registered recipes through `rootBlock.ts`; caller-shaped records cannot substitute for completed native Blocks or registered construction descriptors.
- Constructor connections retain the original declared child descriptor. Completion consumes the exact registered Binding inventory and rejects unknown, duplicate, missing, or mismatched connections before exposing the private executable.
- `runtime/compositionRuntime.ts` creates separate nodes, resource refs, generations, scopes, and Message routing for direct and keyed occurrences. Sharing an implementation Layer does not share those Models or occurrence resources.
- Acquisition lifetime and occurrence lifetime remain separate. Constructor Scope closure invalidates acquired authority. Model removal retires the occurrence, rejects later delivery, and closes its scope; reinsertion creates a new generation.

## Private execution capability

- `block/runtimeCapability.ts` installs authenticated authority beside the actual occurrence refs. The authority identifies both the private implementation and the active occurrence; an incompatible current cursor is rejected.
- `constructed/runtime.ts` resolves authority for every wrapped Command invocation. The memoized execution service does not select or retain the first occurrence's authority.
- Authenticated execution restores the selected node's resources and cursor, marks invocation as outside handler construction, and forks the work into the occurrence scope. Removal interrupts that work. Ordinary external Services and typed handler construction failures remain outside the opaque capability.
- The host runs the actual checked native Block. The compact facade does not fabricate a completed graph, and its full dispatch Codec comes from the actual implementation AST. Pure init, update, and operations stay synchronous; they produce Commands without building or executing handlers.

## Story and Scene

- `withBlock` accepts an original registered descriptor, acquires its graph, authenticates getter-only subjects, and provides a frozen test facade associated with that exact graph.
- Default implementation Layers are scoped to the test. Explicitly supplied implementation Layers retain their surrounding Effect Scope and sharing. A callback assertion failure closes the scopes owned by that test; it does not redefine the lifetime of an externally supplied shared provider.
- Synchronous callbacks and returned Effects are supported. Promise callbacks reject because their work could escape the owning Scope.
- Story and Scene resolve deferred init inside the acquired lifetime and seed the complete init result through the core helper, preserving initial Commands and OutMessages. They do not build handler Layers or execute Subscription Streams.
- `testGraph.ts`, `messageIn`, and `toParentMessageFor` resolve child delivery against the acquired private graph. These pure tests intentionally do not simulate live Runtime generation admission; the public documentation states that boundary.
- Required, optional, and rest dispatch Context remain explicit in the scoped test configuration. Direct transitions use the acquired native update and operation environment, without an ambient current graph.

## Evidence boundaries

The implementation was compared with the existing host/provisioning, runtime-capability, scoped testing, source/emitted, and mutation proof harnesses. Those harnesses cover shared acquisition, cleanup on failure and interruption, wrong implementation/occurrence authority, retired generations, direct synchronous transitions, and rejected Service/channel combinations. The canonical public manifest no longer exposes the five provisional research subpaths; reviewed public consumers use the canonical Block, Program, Story, Scene, and Server entries.

The known ordinary-descriptor pending-host selection limitation is unchanged: original `toLayer` recipes can be included in an ordinary Block's EffectsLayer, while deferred `provideHandlers` selection belongs to the family/native paths. This review did not expand that surface or treat an unsupported shape as accepted.
