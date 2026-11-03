# Constructor security follow-up

## Review scope

The user authorized Daybreak to review `db69206779` and relevant history, with
small fixes resulting from that review. The completed read-only report is
preserved byte-for-byte in [daybreak-report.txt](verification/daybreak-report.txt).
Its hash and authorization scope are in the adjacent receipt.

The six findings prompted the repairs below. Local regression checks and
independent code review support these repairs. They do not constitute a fresh
Daybreak review of the later host-handler and update APIs. Sending the final
integrated candidate requires authorization covering that source snapshot.

## Repairs

1. **Occurrence cancellation.** Commands belong to the occurrence's Scope.
   Deferred work checks that its occurrence is current before starting. Pure
   interruption is quiet; genuine Command and finalizer defects are reported.
   The Program reproduction demonstrated stale work and pending work surviving
   removal. It did not reproduce the report's particular inactive-authority
   crash. [Evidence and mutation controls](daybreak-runtime.md).
2. **Connection ownership.** Connection admission verifies the exact descriptor,
   the live acquisition, and its parent construction token. Canonical nested
   Layer acquisition retains the owning token rather than a transferable
   boolean. Retained connections cannot be grafted into another parent. Normal
   memoized dependency Layers retain their own Scopes.
3. **Configuration snapshots.** Definitions snapshot and freeze their supported
   configuration records before creating public contracts. This covers ordinary
   Definitions and generic families, including nonenumerable own properties.
   Accessors are rejected without being invoked. Schema, Service, and function
   identities are preserved.
4. **Embed teardown.** Each successor waits for the predecessor's full teardown
   Promise. Disposing an intermediate successor preserves that wait. A disposed
   successor cannot start after the predecessor finishes. The handle becomes
   inactive synchronously, and repeated disposal returns the same Promise.
5. **Peer floors.** UI and DevTools declare Foldkit's constructor-capable peer
   floor. DevTools declares the matching UI floor. The real Changesets release
   plan and strict packed consumers verify these requirements together.
6. **Buffered dispatch.** Renderer queue entrypoints retain the captured
   occurrence-currentness predicates. A buffered Message from a removed child
   cannot alter a replacement occurrence that reuses the same key.

## Verification boundaries

Focused regression suites cover occurrence removal, sibling isolation,
finalizer defects, buffered replacement, graph ownership, captured connection
reuse, configuration mutation, host-handler selection, and chained embed
teardown. Purposeful copied-source and copied-declaration mutations demonstrate
that the new checks reject their corresponding broken cases. Independent review
verified the final graph token design after finding that a transferable marker
was insufficient.

The new relay namespace fix is a separate feedback repair. Its portable tests
pass on macOS. Added Linux-only integration cases need a Linux runner; the local
Docker Desktop daemon is stopped. The original PR's green checks predate these
additional cases and are not evidence that they ran.

Publication remains held. Earlier dependency findings and rendering measurements
retain their own snapshots; this report does not relabel them as fresh results.
