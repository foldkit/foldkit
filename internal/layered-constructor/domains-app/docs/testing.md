# Testing

```sh
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test
pnpm exec playwright install chromium webkit
pnpm test:e2e:dev
pnpm test:e2e:worker
```

`pnpm test:e2e:worker` includes the production browser suite and Worker/RPC integration checks. `pnpm test:e2e` is available as a narrower local command.

The regression suite protects these contracts:

| Invariant                                                                                                       | Coverage              |
| --------------------------------------------------------------------------------------------------------------- | --------------------- |
| Startup reads the URL, validates the label, and schedules the bootstrap handoff                                 | Init                  |
| URL changes start lookups; unrelated URL changes retain the current search                                      | Story                 |
| Superseded successes and failures cannot replace current state, including repeated queries and retries          | Story                 |
| Typing and clearing invalidate pending work before URL synchronization completes                                | Story                 |
| Empty queries return to Idle; invalid labels schedule no lookup; valid input recovers                           | Story                 |
| Fresh cached queries and pages restore immediately; stale ranges revalidate without renewing freshness on hits  | Story and browser     |
| Current failures offer retry; failed stale refreshes retain checked results and successful retries replace them | Story and Scene       |
| Pending names render without prices, availability claims, or cart actions in cards and rows                     | Scene and browser     |
| TLD and availability filters compose, empty results recover, and every sort order works                         | Story, Scene, browser |
| Filter selections apply after pending availability resolves                                                     | Story and browser     |
| Cart additions are idempotent, unavailable domains have no purchase controls, and searches preserve selections  | Story and Scene       |
| Card and row actions agree with the cart, removals update totals, and clear controls emit the required Commands | Scene                 |
| Virtualization bounds mounted rows and preserves scrolling through query and viewport changes                   | Scene and browser     |
| Bootstrap listeners release at handoff; early edits, focus, selection, and the input node survive hydration     | Browser               |
| Reloads and history restore queries; initial development HTML is styled; unknown routes return HTTP 404         | Browser               |

Mobile browser regressions in `e2e/domains.mobile.spec.ts` cover narrow portrait and landscape layouts, viewport resizing, readable filter selections, touch target sizes, and submitting or clearing the search. Submission dismisses the touch keyboard before and after hydration. The cart uses Foldkit UI’s Dialog for modal focus, Escape and backdrop dismissal, and page scroll locking; a parent Command returns focus to the cart button after close, including browsers where tapping a button does not focus it.

Accessibility regressions in `e2e/domains.a11y.spec.ts` run axe scans across the landing page, focused empty search, pending and ready results, empty filters, lookup failures, empty and populated carts, and unknown routes at 320, 390, and 1440 CSS pixels. Keyboard tests cover the visible skip link, the complete virtual catalog, modal focus containment and return, cart removal, retry, reduced-motion skeletons, accessible pricing and error descriptions, and narrow-screen text spacing. Status announcements retain their DOM nodes and sit outside busy results content. Cart count changes use a persistent polite live region. Arrow keys, Page Up, Page Down, and Home scroll the page instantly through a Command while the results list is focused. End requests the final virtual row through the bound VirtualList operation. VirtualList observes the document viewport. The macOS WebKit tests use [Option-Tab for full webpage navigation](https://support.apple.com/en-gb/guide/safari/cpsh003/mac). These checks exercise browser semantics and keyboard behavior; listening with a screen reader is a separate manual check.

Stories and Scenes resolve Commands with explicit Messages. They test Model transitions, view wiring, and declared lifecycle behavior without running handlers. Root update Stories under `src/client/story/` cover URL ownership, validation, planning Clock admission, cached query/range reuse, progressive loading, explicit page retry, cancellation races, and cart admission. Generic Query freshness, retention, and completion admission also have framework coverage. App tests exercise the public bound operations and their application consequences. Assert domain results, scheduled work, and user-visible recovery rather than the incidental order of internal bookkeeping. Add browser coverage when real focus, hydration, scrolling, or geometry is the contract; use execution tests for transport, interruption, and RPC request lifetimes.

The search Scene types into the accessible input, resolves URL replacement, explicitly delivers `Navigation.changedUrl`, resolves the Clock and Query fetch, and checks the displayed domain results. Other Scenes protect filters, pricing and cart-action visibility, cart totals, multi-year pricing, accessibility semantics, and keyboard scrolling. `src/client/domainsQuery.test.ts` executes the domain-fetching Effect with the production RPC client, a controlled transport, and Effect TestClock to cover typed failures, timeout, and transport abortion. Query wiring tests cover debounce and the originating request metadata. Direct init tests protect URL-derived startup and bootstrap handoff.

Backend tests execute the production RPC Layer through the typed client. They cover deterministic sample results, complete and partial catalog ranges, label and range validation, malformed JSON, oversized streamed bodies, JSON content requirements, response caching headers, and the absence of outbound HTTP requests.

Browser tests exercise bootstrap, Runtime, real DOM, navigation, and layout with the sample backend and controlled RPC fixtures. They also cover immediate cached backspace restoration without RPC, renewed requests after cache expiry, lookup failures, retry, unconfirmed availability, multi-year totals, and renewal pricing. The Workers suite verifies HTTP 404 recovery against the real sample backend. Its dedicated RPC fixture runs the production handler inside workerd, protecting range handling, deterministic repeat results, independent overlapping requests, and the HTTP request bounds. CI does not depend on third-party domain availability, prices, or uptime.

[CI](../.github/workflows/ci.yml) runs formatting, types, lint, Stories, Scenes, development and Worker browser suites on pull requests and pushes to `main`. The `check` job is the required branch check.

The browser suite builds production output and starts its own workerd preview server on port 5180. Chromium and WebKit cover early typing, focus, selection, input identity, mobile placement, names while prices load, reloads, history, filters, sorting, and the cart. The development check uses port 5181 and holds client scripts back to verify the initial page has its styles and checks that client/SSR identities allow hydration. The Workers suite uses port 5182 for the app and port 5183 for its sample RPC fixture. All local suites refuse to reuse an existing server on their port.
