# KeyedQuery migration sketch for the domains quote windows

## Scope

This is an application migration sketch, not a change to the domains application. The [read-only app audit](/private/tmp/foldkit-keyed-query-capabilities-20261028/app-audit/inventory.md) identifies the active files under `src/client/` and the existing Story and Command coverage. The proposed target uses the new public Query capabilities to replace the application's quote-window cache and per-window fetch machine.

## Target ownership

| Current application owner                                                                                                      | Target                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `quoteCache.ts`, `Model.quoteCache`, cache hit helpers in `steps/search.ts` and `steps/quoteLoading.ts`                        | Remove. One KeyedQuery Model owns retained windows keyed by normalized `{ label, offset, limit }`, completion timestamps, recency, and per-key fetch generations.                                                                                                                                           |
| Earliest-expiry Subscription in `subscription.ts` and expiry handler in `update.ts`                                            | Remove. `staleTime: '1 minute'` controls whether a requested window fetches again. The application requests a freshness check on each visit; time passing alone does not mutate the Model.                                                                                                                  |
| `SearchState.Ready.domains` aggregate and `SearchState.Ready.quoteRequest` nested fetch state in `model.ts`/`searchMachine.ts` | Remove. Derive displayed quotes by merging `Query.read` results for the current planned label windows. The Query's `AsyncData` for each window supplies loading and failure state. The parent keeps display mode, viewport plan, and explicit retry policy, without a second copy of successful quote data. |
| `FetchDomains` request generation and old-result acceptance in `command.ts`/`searchMachine.ts`                                 | Replace with Query's `Fetch` Command, keyed generation, and accepted completion. Keep RPC, 20-second timeout, and typed error mapping in the attached Query handler.                                                                                                                                        |
| `searchGeneration`                                                                                                             | Remove from fetch-result acceptance. Retain a parent planning identity only if delayed URL, debounce, or Clock Messages need to be rejected after the active search changes. An accepted old-label result may remain cached, but cannot change current display or cooldown.                                 |
| `maybeSearchCooldown`, active label/URL, sorting, filtering, viewport, virtual-list reconciliation                             | Keep application-owned. Cooldown is cross-key domain policy. The parent decides which windows are needed and when to retry a failed window.                                                                                                                                                                 |

The 350 ms typing debounce belongs before the first uncached Query request in an application-owned Command or planning step. A fresh revisit should use `requestLoadIfStale` immediately. Scroll-driven window loading follows its own viewport plan; it should not inherit typing debounce. Query decides whether the selected key needs a Fetch, but it does not schedule the application's search interactions.

## Public authoring shape

The domain Schemas and `fetchQuoteWindow` are application-owned. `Domain`, `DomainLabel`, and `QuoteWindow` come from the existing shared domain module; `QuoteWindow` describes pagination arguments, while the response is an array of `Domain`. `SearchCooldown` is the existing application cooldown Schema. `fetchQuoteWindow` performs RPC, the 20-second timeout, and typed error mapping; it does not store quote data or maintain a request generation. The helper Steps below are application policy, not new Foldkit APIs. The public Query and Binding syntax is checked in [the accepted declaration fixture](../packages/foldkit/declaration-tests/query-policy.accepted.ts) and [its relocated consumer](../packages/foldkit/declaration-tests/query-policy.consume.ts).

```ts
import { Result, Schema } from 'effect'
import * as Query from 'foldkit/experimental/query'

const QuoteWindowQuery = Query.define({
  name: 'QuoteWindow',
  data: Schema.Array(Domain),
  error: Schema.Struct({
    error: Schema.String,
    maybeSearchCooldown: Schema.Option(SearchCooldown),
  }),
  args: { label: DomainLabel, ...QuoteWindow.fields },
  staleTime: '1 minute',
  maxSettledEntries: 100,
  notifyOnCompletion: true,
  handler: function* () {
    const client = yield* DomainsClient

    return args => fetchQuoteWindow(client, args)
  },
})

const QuoteWindowBinding = ApplicationDefinition.makeBinding(QuoteWindowQuery, {
  field: 'quoteWindows',
}).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(QuoteWindowQuery, {
    CompletedFetch: ({ args, result }) =>
      ApplicationDefinition.makeStep(model => {
        if (!isCurrentSearchWindow(model, args)) {
          return { model }
        }

        if (Result.isFailure(result)) {
          return applyQuoteFailure(model, args, result.failure)
        }

        return planNextWindow(model, args)
      }),
  }),
})

const requestWindowStep = (args: QuoteWindowArgs, nowMillis: number) =>
  QuoteWindowBinding.requestLoadIfStale(args, nowMillis)

const cancelWindowStep = (args: QuoteWindowArgs) =>
  QuoteWindowBinding.requestCancel(args)
```

`QuoteWindowArgs` names the decoded `{ label, offset, limit }` Schema in the application. The typed failure carries the error text and optional cooldown currently carried by `FailedFetchDomains`; only the accepted completion fold installs that cooldown. Before requesting uncached work, the parent checks its existing cooldown against the Clock Message. A fresh cache hit remains usable during cooldown. Do not put the mutable cooldown in the Query handler constructor or add it to the cache key.

An application Clock Command obtains `Clock.currentTimeMillis` and returns it in a Message. Pure update passes that number to `requestLoadIfStale`; it does not read Clock. `QuoteWindowQuery.pendingArgs(model.quoteWindows)` gives detached snapshots when a label change needs to cancel obsolete work. `requestCancel(args)` invalidates exactly that key's generation and interrupts its currently running Fetch. Other pending keys are unaffected. Restoring a canceled refresh reapplies the settled-entry limit, so retained data may be evicted. The parent fold runs only after Query accepts a current completion; canceled, stale, or duplicate completions produce no notification. The fold checks the current label/window before changing search policy or cooldown.

For display, the parent selects the planned windows for the active normalized label, reads each through `QuoteWindowQuery.read(model.quoteWindows, args)`, and merges successful window data by domain identity in page order. This is a projection from the Query Model. It is not persisted as another `Ready.domains` collection. A failed later page leaves earlier successful windows readable; the parent shows the failed window and waits for an explicit retry.

## Page plan and freshness

1. Initial search plans the first 60-item window. After typing debounce and a Clock Message, update calls `requestLoadIfStale` for that key. An accepted completion can plan the next needed visible window.
2. Revisiting the same normalized label, offset, and limit calls `requestLoadIfStale` immediately. A fresh hit returns existing data and touches recency without a Fetch. A stale hit starts revalidation while the old success remains readable.
3. Scrolling plans one missing visible window at a time and continues to use the latest viewport. A later-page failure preserves earlier quote windows; only an explicit retry requests that failed key again.
4. Global price sort or availability filter plans the complete 556-item catalog, one window at a time, before applying the global operation. The complete catalog is a parent policy, not a Query mode.
5. A changed label cancels pending old-label windows that the application no longer wants. The current display selects only current-label windows; accepted old-label cache data cannot alter it. A rate-limit failure can update `maybeSearchCooldown` only through the current-search parent fold.

The intentional freshness difference is that a one-minute deadline no longer physically deletes a quote window. A later request revalidates it and the old value remains readable during refresh. No expiry Subscription is needed for that policy. `maxSettledEntries: 100` bounds settled successes **and failures** by request/hit/completion recency; pending entries are protected, so total entries can briefly exceed 100. `read` and `isFresh` do not touch recency, and a touch does not renew the completion-based freshness deadline. This changes the old success-only cache's exact eviction accounting and should be visible in migrated tests.

## Migration verification

- Port `cachedQuotes.story.test.ts` for normalized key identity, fresh revisit, completion-anchored one-minute deadline, recency touch without deadline renewal, 100 settled entries, and fresh data access after another label fails. Replace the old physical-expiry assertion with stale-while-revalidate behavior.
- Port `progressiveQuotes.story.test.ts` for first 60, later visible windows, retained earlier results on failure, explicit retry, the full 556-item catalog, and changed-label cancellation/admission.
- Keep `cooldown.story.test.ts` for current-search-only rate-limit installation, expiry, and cached quote access during cooldown. Keep `TestClock` Command coverage for the 350 ms typing debounce, 20-second timeout, completion time after RPC, and cooldown preflight.
- Add a cancellation race where cancel precedes Fetch fiber start, and an accepted-completion fold check where a rejected generation emits no OutMessage. Keep view and accessibility Scenes; Query internals do not replace application behavior tests.

This target is specific to retained quote windows. The [Workspace Query assessment](workspace-query-assessment.md) still keeps its direct `AsyncData` ownership because mutation reconciliation and routed child initialization need different parent policy.
