# Scene URL-change delivery

## Scope

Implements [#1821](https://github.com/foldkit/foldkit/issues/1821) on top of the
Machine authoring commit `f9335b8cd2e09a49a2c251356eb5d49c3d5c701a`.
The work is local to `codex/workspace-example`. Publication stays held.

## Consumer API

Configure `routing.onUrlChange` in `scene({ update, view, routing }, ...steps)`
and deliver the routing event with `Navigation.changedUrl('/?q=foldkit')`.
The handler accepts the same callback or canonical Message constructor as
Program routing. Inline callback parameters infer Foldkit's `Url` type.

The [source-backed search snippet](../packages/website/src/snippet/sceneNavigation.ts)
shows typing, cancellation and navigation Command completion, explicit URL
change, fetch completion, and visible results. Its feature contracts are checked
against the [search fixture](../packages/foldkit/src/test/apps/searchRouting.ts).
No navigation Effect or Command handler executes in this Scene.

Relative references resolve against a fixed `http://localhost/` root. Optional
`routing.origin` selects another absolute origin, accepting a trailing slash
and rejecting credentials, paths, queries, fragments, or opaque origins.
Absolute URLs retain their own origin. Each event resolves independently;
Scene does not retain a current URL or emulate browser history.

## Contracts

- A tagged, noncallable URL step cannot enter Scene's existing function-transform
  arm. Missing or optional routing rejects the event, including nested `inside`
  steps. Erased callers receive a configuration diagnostic.
- `NoInfer` keeps Model, Message, OutMessage, and registered Subscription contracts
  owned by the Scene configuration. A URL event grants no arbitrary Message
  injection or Subscription registration.
- Delivery invokes one routing handler, applies its Message through update,
  captures OutMessages, rerenders, and reconciles Mounts through existing Scene
  machinery. It preserves the last interaction's outcome and acknowledgement.
- The external-Message boundary rejects unresolved ordinary Commands and Mounts
  and unacknowledged ended Mounts. Existing keyed/interruptible exemptions apply.
  `Command.keepPending` permits an exact Command to complete after URL delivery;
  delivery never resolves it. Final completeness includes every kept Command.
- Production and Scene share canonical-constructor normalization, using the
  established constructor identity and `{ url }` payload wrapping. Production
  request-handler behavior is preserved too.

The public Scene signature uses three paired overloads: definite callbacks for
contextual typing, definite callback/constructor unions, and optional routing
without URL steps. Each pair preserves the previous OutMessage and Subscription
parameter orders. This adds internal signature maintenance; ordinary consumers
supply no additional generics. A configuration annotated as optional routing
must be narrowed before it can deliver URLs.

## Verification

Final evidence lives in `/private/tmp/foldkit-scene-navigation-1821-20261027`.

- Core source, dedicated routing source fixtures, Website, and scripts typecheck.
- Scene and production routing suites: 936 tests across 14 files, including 18
  navigation cases. Coverage includes both Command/event orders, invalidation
  after typing but before URL delivery, relative/query/fragment/absolute URLs,
  explicit origins, malformed erased configuration, Mount boundaries, and
  OutMessage replacement. No browser history or navigation Effects execute.
- The unchanged strict emitted-declaration gate includes routing acceptance,
  rejection, and consumer fixtures and physically relocates emitted declarations.
- A fresh packed consumer compiles with TypeScript 6.0.3 and 7.1.0-beta, strict
  mode and `skipLibCheck: false`. It accepts inferred callback/canonical forms,
  nested delivery, combined Subscriptions/OutMessages, and explicit three-/four-
  type-argument calls. Rejected cases are compile-only. Two packed tests execute
  all accepted forms and the copied Website snippet against public imports.
- All seven existing compiler fixtures pass without changing ceilings. The
  eight-group Workspace fixture uses 4,264,711 instantiations and 276,361 types;
  the Machine fixture uses 82,847 instantiations and 18,591 types.
- Mutation controls in an isolated source copy prove the routing-presence
  rejection, pending-work boundary, and canonical-constructor tests fail when
  their protections are removed. Restored source and runtime controls pass;
  live implementation hashes are unchanged.
- Focused standard/Effect lint, formatting, whitespace and changeset checks pass.
  API generation succeeds with 321 warnings about private/inherited references,
  including the internal routing contracts used by the public signature. There
  are no API generation errors. Website client and SSR builds pass.
- The production Scene guide and snippet are inspected at a 1440px desktop
  measure using an isolated temporary server. This checks SSR presentation;
  it makes no hydration claim and does not use the user's development server.

Independent design and source assessments pass. Exact-commit review is the
final local gate. No push, issue closure, deployment, or release is performed.
