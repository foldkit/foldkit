# TSDoc Expansion Plan

Functions and types with one-line TSDoc that warrant fuller documentation,
following the `makeManagedResources` exemplar (lifecycle, config fields, example, @see).

## Route Parser Combinators (`route/parser.ts`)

- **`oneOf`** — Why it returns `Parser` (not `Biparser`), loss of `build` capability
- **`slash`** — Object merge semantics, key collision, why query must be terminal
- **`query`** — Schema validation ↔ route parsing coupling, terminal chain constraint
- **`mapTo`** — Constructor shape requirement (`{ make(...) }`), zero-arg vs single-arg
- **`param`** — Parse/print asymmetry (parse can fail, print cannot)
- **`parseUrlWithFallback`** — Synchronous `Effect.runSync` boundary, fallback semantics
- **`Biparser` / `Router` / `TerminalParser`** — Unified explanation of the three types and when each is produced/consumed

## Runtime (`runtime/runtime.ts`)

- **`makeSubscriptions`** — Deps change detection, stream restart semantics, structural comparison
- **`Subscription` / `Subscriptions`** — `modelToDependencies` contract, stream lifecycle

## Managed Resources (`managedResource/index.ts`)

- **`ManagedResource.tag`** — Two-level currying, R channel service binding, `.get` error semantics

## UI Components (`ui/*/index.ts`)

- **`InitConfig`** (menu, dialog, tabs, listbox, disclosure) — Field interactions, defaults, `isAnimated` + `isModal` interplay
- **`update`** (menu, dialog, tabs, listbox, disclosure) — State machine transitions, message flow, emitted commands

## HTML (`html/lazy.ts`)

- **`createLazy`** — Referential equality memoization, `===` comparison for args, skips Snabbdom diff
- **`createKeyedLazy`** — Keyed variant, cache map lifecycle
