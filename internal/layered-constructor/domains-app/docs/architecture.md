# Application architecture

The search input arrives in static HTML, accepts edits before hydration, and moves into the header without replacing the input. Domain names update immediately; sample prices and availability load progressively through Effect RPC. The catalog contains 556 extensions from Vercel’s [supported domains](https://vercel.com/docs/domains/supported-domains) list.

## Code map

`src/client/` owns the Foldkit application, browser startup, SSR renderer, and Story/Scene tests. `src/server/` owns the Worker entry and sample-domain RPC handlers. `src/shared/` owns domain and RPC contracts, the candidate catalog, and sample-data generation. Shared code imports neither implementation. The Worker entry connects backend routing to frontend SSR. Lint enforces these import boundaries, with execution-test exceptions for exercising the real RPC client and server together.

- `src/client/model.ts` and `src/client/message.ts` declare state and events. `init.ts` starts a search from the URL; `update.ts` maps Messages to search, filter, and cart transitions.
- `src/client/steps/` owns reusable parent Steps shared by update, composition, and init. `domainPlanning.ts` selects the next required candidate range without creating Commands. `searchViewState.ts` derives search status and checked domains from Query data.
- `src/client/domainsQuery.ts` defines the KeyedQuery Block, one-minute freshness, a 100-settled-entry retention bound, and the typed RPC fetch handler. `command.ts` defines the EffectsLayer, including Clock reads and URL synchronization; `services.ts` supplies the Runtime-scoped RPC client.
- `src/shared/domainsRpc.ts` shares RPC payload, success, and failure Schemas. `src/client/rpc.ts` constructs the typed client; `src/server/rpc.ts` supplies HTTP transport and request bounds; `src/server/search.ts` serves deterministic sample results without outbound requests.
- `src/shared/domain.ts` defines domains, pricing, labels, candidates, and ranges. `src/shared/demoDomains.ts` generates sample results. `src/client/domain/` exports listings, filters, sorting, formatting, candidate-range planning, and the Cart Schema through its barrel.
- `src/client/filterListboxes.ts` defines typed filter and sort Listbox Blocks. Desktop Listboxes and mobile sheets share transitions through `steps/filters.ts`; mobile choices apply directly and close their animated sheet. The TLD sheet searches the full catalog.
- `src/client/route.ts` defines the bidirectional search router. The Model stores the parsed Route. Input changes replace the URL, and `ChangedUrl` updates the Route before starting its lookup.
- `src/client/resultsList.ts` creates the VirtualList Block and locates pending listings in the viewport and overscan area. `children.ts` adapts existing Query and UI Blocks once. `composition.ts` binds them to the root Model and owns their policies and deferred startup arguments. `resultListings.ts` selects displayed listings. `block.ts` yields those relationships in a Layer-owned constructor and returns the portable init, update, view, children, and handler Layer.
- `src/client/focusTarget.ts` shares stable control IDs between the view and focus Commands. Focus uses `Dom.focus` after the render commits, with scrolling suppressed.
- `src/client/view.ts` contains named views and layout utilities; `styles.css` defines the Tailwind theme, reusable components, and single-input positioning. `icon.ts` renders Lucide icons; attribution is in `THIRD_PARTY_NOTICES.md`.
- `src/client/entry.server.ts` renders the same Block for static generation and request-time SSR. `src/server/entry.ts` delegates page rendering, routes `/rpc` and `/rpc/` to the Effect RPC server, and disposes its handler on development reload.

Unknown paths render a NotFound page with a link back to search and return HTTP 404.

## Following a search

Start with `steps/search.ts`: input changes request URL replacement, and `ChangedUrl` stores the Route before starting the four Top Results. The shared `invalidateSearch` operation cancels pending requests and invalidates planning Clock Messages. Input changes invoke it before URL delivery; URL changes invoke it independently to handle history navigation and direct routing. Query owns per-key fetch generations.

`steps/domainRequests.ts` coordinates domain requests in execution order. `requestNextDomainRange` asks the planner for a range, and `requestDomainRange` reads Effect Clock through a Command. Its completion enters `loadDomainRange`, which rejects outdated or overlapping work before asking Query to reuse fresh data or load it. Accepted Query completions enter `continueSearchAfterDomainRequest`, which plans the next request and informs the results list. Query owns storing the returned domains.

`steps/resultSelection.ts` owns which Query ranges contribute to displayed results. `includeDomainRangeInResults` adds a requested range once. `useFullCatalogResultsIfLoaded` replaces partial ranges with a successfully loaded complete catalog; both fresh-cache reuse and accepted request completion apply this policy.

`domainPlanning.ts` answers which candidate range is needed next, returning an `Option<DomainCandidateRange>`. It selects the complete catalog for availability filtering or price sorting; otherwise it asks `resultsList.ts` for the first pending listing in the viewport and overscan area. The planner waits for pending work and leaves failed ranges for explicit retry. `requestNextDomainRange` schedules the selected range. Query data supplies the displayed domain results through `searchViewState.ts`, without copying the cached domains into another Model field.

`selectedDomainRanges` chooses which Query entries contribute to this search view; the cache also retains entries from previous searches and other range sizes. A successful complete-catalog lookup replaces the partial selection so older page failures and results do not override it. Starting a search resets the selection while retaining the cache.

Pending listings have no price, availability, or cart action until their results arrive. After the four Top Results, the rest of the first page uses a separate non-overlapping range. Scrolling requests missing pages while preserving checked domains. Progressive ranges bypass the input debounce.

All Results uses Foldkit UI’s VirtualList with `ScrollContainer.Window()` and positioned rows. The document scrolls beneath the sticky navigation, and the results occupy their full content height. Groups of six domains preserve the responsive three-column, two-column, and single-column grid, and matching width-based estimates guide layout and progressive domain loading. Measured heights account for wrapping and viewport changes. VirtualList preserves the scroll anchor as results change. A bounded static skeleton preview covers the initial measurement before VirtualList renders its visible window.

## Sample domain search

The browser calls `SearchDomains` through Effect RPC over HTTP at `/rpc`. Client and server share the label validator, domain result Schema, candidate-range bounds, and typed `Unavailable` failure. The RPC client is acquired once for the browser Runtime; each lookup is an interruptible Foldkit Command. Each server-side RPC transport lives in its HTTP request’s Scope.

The backend generates deterministic availability and USD registration/renewal prices from the normalized label and curated candidate catalog. It returns a validated offset/limit slice and makes no outbound network requests. Sample data is labeled beside Top Results and in the footer; the cart explicitly makes no purchase or reservation. Unconfirmed sample names have no price or cart action.

The browser requests four candidates initially, then the other 56 first-page candidates and later pages as they enter the virtual list’s viewport and overscan area. A later-page transport failure preserves checked domains and offers an explicit retry. Price sorting and availability filtering request the complete catalog. Partial counts identify how many candidates have loaded.

KeyedQuery owns the frontend cache in the root Model. Its key includes the normalized label, offset, and limit. Fresh results are reused for one minute after completion, bypassing debounce and RPC. Hits update recency without extending freshness. At most 100 settled entries are retained; pending entries are protected. Changing a query cancels its pending requests, and Query generations reject stale, canceled, and duplicate completions. Cached results are not copied into another Model collection.

Requests larger than 1 KiB or without JSON content are rejected at the HTTP boundary. The browser Command has a twenty-second deadline and maps transport failures to a retriable error. Interrupting a superseded Command aborts the browser HTTP request. The app exercises caching, retry, progressive loading, and cancellation against the sample backend.

## Before hydration

`src/client/bootstrap.ts` supplies the inline script that runs after the static markup and before the main module. Its input ID and media queries come from `src/client/searchInput.ts`, shared with the hydrated app. It reads the query from the URL, synchronizes early edits with history, and updates pending domain names. CSS positions the same input in the landing or header location, including on first mobile focus.

Foldkit adopts the existing input node and preserves focus. A controlled `h.Value` reconciles with the initial Model; early edits are not automatically replayed into that Model. The bootstrap stores the query in the URL so init reads it before hydration. A Command removes its listeners when the Runtime takes ownership. Framework support for this handoff is tracked in [foldkit/foldkit#1784](https://github.com/foldkit/foldkit/issues/1784).

The input is editable before the main bundle executes.

## DevTools

The deployed app includes the Foldkit DevTools button. Select it to inspect Message payloads, Model changes, Commands, and Mounts. Inspect mode shows the selected Message’s state in the inspector while searches and the virtualized results stay live. `@foldkit/devtools` is a production dependency so the Vite plugin includes the overlay in the shipped build. The browser entry explicitly imports the plugin's overlay module for SSR builds. The panel remembers whether each visitor left it open.

The scaffold's `AGENTS.md`, `FOLDKIT.md`, and DevTools MCP configuration support agent-assisted development. The MCP server uses the installed preview package.
