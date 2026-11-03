# Migration baseline before InMessages

## Completed root change

The original public Model, local Messages, init arguments, Command definitions, extracted parent Steps, child policies, and view helpers remain the app's contracts. `definition.ts` establishes them with `Layered.makeDefinition`. `composition.ts` remains their static authoring inventory. `block.ts` acquires the eight declared relationships and completes the implementation through `ApplicationDefinition.makeBlock`.

Existing Query, VirtualList, Dialog, and Listbox implementations cross a single `fromBlock` boundary in `children.ts`. Acquisition does not run their initializers or handler constructors. The parent's `makeInit` plan still derives deferred child arguments and places Models; ordinary Program and server entries retain startup ownership.

The root's constructor has no external requirements. The Query fetch handler and root Program retain the precise `DomainsClient` requirement. Normal application provisioning supplies its production RPC Layer. Story and Scene graph acquisition needs no client mock, executes ordinary synchronous test Steps, and resolves Commands explicitly.

## Real extraction preserved

- `steps/domainRequests.ts` invokes `DomainsQueryBinding.requestLoadIfStale(args, nowMillis)` or `requestRevalidationOrLoad(args, nowMillis)` in the existing extracted loading pipeline.
- `steps/search.ts` invokes `DomainsQueryBinding.requestCancel` to invalidate obsolete work.
- `steps/resultsList.ts` invokes `ResultsListBinding.informItemsChanged` and retains `initAndSet(ResultsListBinding, model, { args: [resultsListConfig] })` for an actual viewport reset.
- `update.ts` directly uses Dialog open/close operations and the VirtualList scroll-to-end operation.
- `view.ts` retains graph-aware `Binding.embedView` calls, without importing acquired child instances or threading a constructor dependency bag.

No extra application type annotations, generic lists, casts, or duplicate canonical result data were needed.

## Next InMessage proof seams

This baseline intentionally keeps operations. A later proof can compare the public request surface for these exact responsibilities:

| Child        | Existing request responsibilities                            | Semantics to preserve                                                                                                  |
| ------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| DomainsQuery | Conditional load, forced revalidation, targeted cancellation | Exact args and clock input, fresh cache hits, independent range retention, cancellation and accepted-completion policy |
| ResultsList  | Item changes, scroll to end                                  | Pure synchronous Model transition and returned Commands, exact generated child routing                                 |
| Dialogs      | Open and close                                               | Three distinct occurrences of the same implementation, retained Models and animation/Mount cleanup                     |

The comparison should keep extracted parent transitions and their composition intact. Public request Schemas must earn their cost through clarity and checked contracts. Startup construction and `initAndSet` remain initialization, not invented request Messages. Query completion OutMessages remain on Binding policies, distinct from parent Message handlers and child requests.

This document does not prescribe an unimplemented InMessage spelling or change the migrated app. The runnable baseline and its inventory should remain available for comparison.
