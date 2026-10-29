# Query lifecycle capabilities

## Scope

The Foldkit followup branch adds freshness, bounded KeyedQuery retention, targeted cancellation, and accepted-completion OutMessages. The domains application was inspected read-only. Its migration is described in the [quote-window migration sketch](keyed-query-capabilities-migration-20261028.md); no application migration or publication is included.

The base commit is `4412a76830eb0f6f2309a99856a22cec051ab89b`. Verification applies to the working-tree Query sources recorded in `/private/tmp/foldkit-keyed-query-capabilities-20261028/lead/final-manifest.json`, rather than to that commit alone. Existing concurrent Schema/type-alias guidance is preserved.

## Public capabilities

| Capability                     | Query                                                                            | KeyedQuery                                                               |
| ------------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Completion-based freshness     | `staleTime`, `isFresh(model, nowMillis)`, `requestLoadIfStale(model, nowMillis)` | Same policy per key, with `args` before `nowMillis`                      |
| Bounded retention              | One retained resource                                                            | Optional `maxSettledEntries`, with request/hit/completion recency        |
| Cancellation                   | `requestCancel(model)`                                                           | `requestCancel(model, args)` and detached `pendingArgs(model)` snapshots |
| Parent completion coordination | Opt-in `notifyOnCompletion: true`                                                | Same option, with the accepted request's stored args in the notification |

Direct convenience operations support their established data-first/data-last forms. A registered Binding projects the operation arguments into a connected parent Step. `read`, `isFresh`, and `pendingArgs` are selectors on the Query value, rather than Binding operations.

Freshness defaults to Infinity, keyed retention defaults to unbounded, and completion notifications default off. The three existing state-based loading operations retain their policies. Query Model Schemas include freshness metadata; KeyedQuery adds recency metadata too. Constructors default the added metadata, but persisted encoded Models require migration. Fetch Commands have generation-specific interruption keys. These experimental surface changes are recorded in the changeset.

## Lifecycle rules

- Fetch handlers read Effect Clock after execution. Each accepted success records its own completion time. A failed refresh preserves the last success and its timestamp.
- `requestLoadIfStale` receives a finite Clock timestamp through an application Message. At the exact deadline the value requires revalidation. Expiry changes eligibility for reuse; it does not delete display data or schedule work.
- `read` and `isFresh` do not touch recency. Request operations, including hits, and accepted completion admission do. Touching a key does not renew freshness.
- The retention bound counts settled successes and failures. Pending entries are protected, so total entries can temporarily exceed the configured bound. Settlement and cancellation back to a settled value apply the limit. Capacity eviction can remove retained data; TTL expiry alone cannot.
- Canceling an initial load removes its empty entry. Canceling a refresh restores retained successful data, subject to the settled-entry bound. Other pending keys are unaffected.
- Cancellation invalidates acceptance synchronously and returns an interruption Command for exactly the selected key and generation. Already-running interruptible Effects release their resources. If the interrupt executes before the Fetch registers, it may find no holder; any resulting late completion is nevertheless rejected. An old interrupt cannot cancel a newer generation.
- Only a pending, matching-generation completion settles data or emits `OutMessage.CompletedFetch`. Duplicates, reset/canceled generations, and missing/evicted entries are silent. Notifications use the stored request args rather than trusting completion args.
- Request operations remain OutMessage-free, including on notifying Query Blocks. They work in init plans and ordinary Step composition. A possibly notifying Query, including one selected by a runtime boolean, requires a parent OutMessage policy.

## Ownership and migration

The domains migration removes `quoteCache.ts`, `Model.quoteCache`, its expiry Subscription, copied `Ready.domains`, the nested per-window fetch Machine, and application fetch-generation acceptance. Displayed quotes derive from public `read` results. The parent retains URL synchronization, immediate candidate names, debounce and window planning, sorting/filtering, cart behavior, and provider cooldown policy. It folds accepted completions to request further windows or install a current-search cooldown.

The initial 60 candidates, additional viewport windows, complete 556-candidate catalog, fresh cache revisits, and explicit retry after a later-page failure are application workflows over the same public operations. The [migration sketch](keyed-query-capabilities-migration-20261028.md) includes exact fields/helpers to remove, public authoring code, and application tests to port. The [accepted fixture](../packages/foldkit/declaration-tests/query-policy.accepted.ts) and [relocated consumer](../packages/foldkit/declaration-tests/query-policy.consume.ts) exercise realistic provider and parent wiring.

## Declaration maintenance

Factories return named plain/notifying Query interfaces and named exact Model Schema interfaces. This preserves inferred consumer declaration emission and readable editor hovers without requiring consumer annotations. The notification selection distributes over a boolean, preserving the possible completion channel. Query's AsyncData types use its public barrel so inferred consumer declarations can name that boundary.

## Review checklist

- [x] Verify all four gaps against the branch and inspect the active domains application.
- [x] Share freshness and cancellation state transitions with ordinary Query.
- [x] Preserve passive construction, exact arguments, handler requirements, constructor errors, registration evidence, and default no-OutMessage composition.
- [x] Exercise freshness boundaries, retention/recency, cancellation isolation and resource release, late completions, and accepted notifications.
- [x] Check source, emitted, relocated, packed, and split-file public consumer usage.
- [x] Keep existing compiler fixtures and ceilings unchanged.
- [x] Update active Query guidance, copyable snippets, scaffold guidance, application skills, and the task board.
- [x] Provide a concrete app migration sketch while leaving the application read-only.
- [x] Obtain independent reviews of the lifecycle/public type contracts and the declaration repair.
- [x] Preserve the published preview snapshot and publication hold.

## Verification

Evidence is retained under `/private/tmp/foldkit-keyed-query-capabilities-20261028`.

- Framework source checking and Query source acceptance/rejection fixtures pass on TypeScript 7.1.0-beta.
- All **76 Query tests** pass, including registered parent Stories and controlled-clock/resource execution tests. The API Cache Query example passes its typecheck and **16 existing tests**.
- The complete emitted-declaration harness passes strict external emission, rejection checks, relocation, native completion, and inferred configuration documentation checks.
- A real local npm tarball passes strict consumer checks with `skipLibCheck: false`, exact optional properties, and TypeScript **6.0.3 and 7.1.0-beta**. Its executed public-API smoke test covers Clock timestamps, freshness, accepted notification, retained data, and cancellation.
- All **seven unchanged compiler fixtures** pass. The unchanged Machine fixture measures **82,847 instantiations / 18,591 types**, below its **83,700 / 18,800** ceilings. No runtime rendering speedup is claimed.
- Six isolated mutations make the intended runtime/type gates fail: expiry boundary, pending-entry protection, completion generation, hit recency, required runtime notification flag, and broad-boolean completion policy. Restored controls pass; the live sources are unchanged by these mutations.
- Public consumer/editor checks retain exact payload completion and show a compact named Query contract. Standard and Effect lint, formatting, Website typechecking/builds, and desktop guide inspection pass. The Clock and completion-policy snippets also compile against the packed public API with both TypeScript versions.

This is framework verification and a migration plan. The domains application's existing behavior tests must run after its separate migration; they are not counted as passed here.
