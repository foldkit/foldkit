# Effect handler Layers

This is the working checklist for separating Foldkit effect definitions from their production implementations. Update the checkboxes as each slice is completed.

## Status

**Current milestone:** Ready for PR review. First-party code and active docs use `FooLayer`, feature `layer` exports, and service capture during handler construction. Full repository gates passed. Independent implementation, consumer API, documentation, and committed-diff reviews found no unresolved defects.

**Next implementation:** Design whole-application testing against the handler identities and Layer boundaries established here.

**Scope:** Production handler Layers and application assembly. Whole-application testing APIs are deferred.

| Milestone                                 | Status   | What the user can use afterward                                                       |
| ----------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| Command handlers                          | Verified | Define a Command separately from its handler Layer.                                   |
| Application assembly                      | Verified | See unsatisfied requirements on an application and provide Layers before starting it. |
| Subscription and ManagedResource handlers | Verified | Replace implementations while preserving Model-driven lifecycles.                     |
| Mount boundary                            | Verified | Register Layer-backed Mount definitions to carry their requirements.                  |
| Embedded Element assembly                 | Verified | Provide handler Layers and Flags services to a container-scoped Element.              |
| Migration and verification                | Verified | First-party apps, templates, and active docs use the final API.                       |
| Service substitution and app lifetimes    | Verified | Run real handler logic with different dependency providers and share app services.    |

## Target surface

- `Command` definitions declare identity, arguments, result Messages, and interruption behavior. `toLayer` supplies an implementation.
- An application carries its unsatisfied Effect requirements until a Layer is provided. The application config does not own an app-wide `resources` Layer.
- Subscriptions retain record keys as registration identities and gain explicit, stable handler names and emitted Message declarations. Their Model dependency logic stays with the definition; a Layer supplies the Stream factory. A named entry with Message declarations and no dependency map handles Streams without local Model dependencies. Lift and aggregation preserve the handler identity and Message contract.
- ManagedResources retain Model-driven acquisition and release. A Layer supplies the acquire and release functions, while `managedResources` registers the lifecycle and result Messages with the application.
- Mount definitions retain their names and element-driven lifecycle. Layer-backed Mounts enter the application requirements through explicit registration because `view` does not expose handler requirements.

## Work items

### Layer naming and handler constructors

- [x] Name individual handler and provider Layers `FooLayer`, alternative test providers `FooTestLayer`, and composed feature exports `layer`.
- [x] Rename composition modules to `layer.ts` and update application entries, barrels, snippets, and scaffolds.
- [x] Capture stable service dependencies with Effect constructors where that makes the handler boundary clearer. Keep changing inputs and actual work inside the returned handler.
- [x] Explain construction, lookup, execution, and application versus operation lifetimes in active docs and published TSDoc.
- [x] Show execution tests using real handler Layers with controlled dependency providers built beneath them.
- [x] Verify constructor reuse, deferred execution, service substitution, and scoped cleanup in the Foldkit suite. The context precedence assertions detect an incorrect merge order.
- [x] Complete independent consumer API, documentation, and implementation reviews and address their findings.
- [x] Run repository gates, including the full workspace build, type checks, unit suites, and 18 website browser tests without retries.
- [x] Review the exact committed diff before publication.
- [x] Prepare the PR review guide with the final naming and constructor examples.

### Constructor verification

- Full workspace build, all 52 TypeScript projects, formatting, lint, dead-code, script tests, and source gates passed.
- Full workspace unit suites passed, including 3,011 Foldkit tests (one skipped), 1,307 website tests, and the first-party application suites.
- All 18 website browser tests passed without retries. Application Layers and Project Organization were also inspected at their normal desktop measure.
- The Foldkit handler suite covers constructor reuse, deferred execution, and captured versus invocation services. Reversing invocation-context precedence makes the relevant assertion fail. Weather execution tests use the real handler with a controlled HTTP provider.
- WebSocket lifecycle tests verify that capturing its constructor does not move socket acquisition or cleanup out of the Model-driven handle scope.

### 1. Type and lifecycle proof

- [x] Prove a Layer-backed Command contributes a synthetic handler service to an inferred update return.
- [x] Add `Update.make` to validate update results and infer the union of Command handler requirements.
- [x] Migrate explicit `Message.match<Update.Return<...>>` and Step annotations where their `R` would otherwise be fixed to `never`. Pure updates may retain these annotations.
- [x] Prove an application can retain and satisfy requirements from init, update, Subscriptions, and ManagedResources without manually listing each service generic.
- [x] Prove client-only application requirements from init, update, and Subscriptions survive Layer provision, including dependencies introduced by a handler Layer.
- [x] Prove handler Layers can capture construction context and merge it with the execution context, with an explicit duplicate-service precedence rule.
- [x] Check that Command Message lifting preserves handler requirements and Command identity. The existing Submodel fold type tests cover service unions; a layered Submodel example remains part of migration.
- [x] Set an application-wide identity and collision rule for handler names before migrating shared Submodels. Distinct registered Subscription and ManagedResource definitions with the same name fail at `Application.make`; Command Layer mismatches fail when the Command runs because Commands are not registered at assembly. Lifted uses of the same definition can share its Layer.
  - The website's note player and async counter demos use distinct handler identities for their phase delay Commands.

### 2. Application assembly

- [x] Separate application definition, Layer provision, and host startup for `run`, `hydrate`, and `embed`.
- [x] Add `Application.make` and chainable `Application.provide` for client-only applications without Flags or routing. `Application.provide` supports data-first calls and data-last composition with `pipe`.
- [x] Extend application assembly to Flags and routing, including hydration and embed startup through the provided runtime internals.
- [x] Remove `resources` from application configuration after the replacement path works.
- [x] Keep runtime-provided ManagedResource accessors and Port channels available to handlers.
- [x] Place handler Layer construction after runtime-provided services exist. A Layer can acquire a Model-driven ManagedResource accessor while it is constructed.

### 3. Command handlers

- [x] Add a synthetic service for Layer-backed Command definitions and `toLayer(handler | Effect<handler>)`.
- [x] Preserve Command identity, argument capture, result Message mapping, and interruption. Existing Command and DevTools tests pass.
- [x] Migrate first-party page-owning Command definitions and application Layers. The website's 27 production Commands, all 33 page-owning example entries, Typing Game, and the Embedding example are migrated.
- [x] Name individual handler Layers after their definitions (`PlaceOrderLayer`); use feature-level `layer` for composition and re-exports.

### 4. Subscription and ManagedResource handlers

- [x] Add a named Subscription handler identity distinct from the record key. Preserve it through lift and aggregate. The current API has no rekey helper.
- [x] Require named Subscriptions to declare emitted Message schemas, constrain handler Stream output to that union (`never` for an empty declaration), and preserve declarations through lift and aggregate.
- [x] Reject distinct Subscription definitions that use the same handler name in one application.
- [x] Move Subscription Stream implementations into handler Layers without changing restart and keep-alive behavior.
- [x] Move ManagedResource acquire and release implementations into handler Layers without changing active-value access or release timing.
- [x] Migrate first-party page-owning Subscriptions and ManagedResources. The website, page-owning examples, and Typing Game use Layer-backed handlers where the implementation is app-owned.
- [x] Document Subscription names as the supplied event stream or scoped behavior, distinct from the registration key and Layer binding. First-party handler names and Layers follow that guidance.
- [x] Migrate SSR and SSG scaffolds to `Application.make`; the SSR cookie-writing Command has a handler Layer.

### 5. Mount boundary

- [x] Document the `view` type boundary that prevents Mount handler requirements from joining the application `R` channel.
- [x] Choose explicit Mount registration rather than propagating requirements through `Html` and `Document`.
- [x] Add `Mount.toLayer` for one-shot and streaming definitions, preserving element-driven acquisition, teardown, and Message lifting.
- [x] Infer registered Mount requirements into `Application.make` and validate rendered Mounts before patching the DOM.

`view` returns a `Document`, and `MountAction.f` currently returns a Stream with no exposed `R`. A Mount used only inside `view` therefore cannot add a handler requirement to `Application.make` by inference from update or Subscriptions. The application will register its Layer-backed Mount definitions in a `mounts` collection. That collection contributes handler requirements to the application's `R` channel. A pre-patch check of rendered Mount identities will reject unregistered Layer-backed actions, including ones revealed by later Model states. An unused registration is valid because conditional views are normal. Inline Mounts need no registration.

### 6. Embedded Element assembly

- [x] Add a Layer-aware `Application.makeElement` path for container-scoped apps. Include Flags, init and update Commands, Subscriptions, ManagedResources, and registered Mounts in its requirements.
- [x] Migrate the Embedding example to `Application.makeElement` and feature-composed handler Layers.
- [x] Retire `resources` from legacy `Runtime.makeApplication` and `Runtime.makeElement` after replacing their lifecycle tests. Those constructors remain available for self-contained effects; shared services enter through `Application.provide`.

### 7. Verification and publication

- [x] Complete active documentation, examples, and template migration for the final public API.
  - The website and all 33 page-owning example entries use `Application.make`. The experimental Query fetch API also has a Layer boundary for keyed and unkeyed Queries.
  - Runtime entry, Resources, and ManagedResource teaching snippets use `Application.make` and `toLayer` where those APIs apply.
  - `skills/generate-program` and active README guidance teach `Application.make`, `Application.makeElement`, and feature-composed `layer` Layers.
- [x] Verify feature Layer composition with the website's 27 production Commands, then migrate its application entry without listing every handler there. Documentation snippets account for another 51 definitions.
  - Each feature owns a `layer` Layer next to its update/lifecycle definitions. Features with multiple modules compose their local Layers and export one `layer` from their barrel.
  - `src/layer.ts` composes feature Layers and service providers. `entry.ts` imports that one `layer` value and calls `Application.provide` once; it never imports individual handler Layers.
  - The 14 site-shell Commands compose into boot, navigation, and preference Layers. The two Home phase delay Commands have distinct names.
- [x] Run workspace type checks, all Foldkit unit tests, focused example tests, and lint for the current slice.
- [x] Resolve API reference generator warnings about helper types exposed through the new public signatures.
- [x] Run the website build and browser smoke suite after its migration.
- [x] Run the full workspace build and TypeScript gates after the Element migration.
- [x] Run the website end-to-end suite after the Element migration.
- [x] Review the full diff for public API coherence and migration guidance.

## Verification snapshot

The following snapshot covers the completed handler and application API milestone. The service assembly follow-up has its own checklist below.

- All 52 projects passed TypeScript checks and the full workspace build.
- The full workspace test command passed, including 3,007 Foldkit tests (one skipped), 1,304 website tests, and the first-party application suites.
- All 18 website browser tests passed serially with retries disabled.
- Formatting, lint, dead-code, and `git diff --check` passed.
- Script TypeScript checks, script tests, and repository source gates passed.
- The API reference generator completed without warnings.
- Scaffold smoke, packed SSR consumer, scaffold server rendering, host and DOM parity, and repeatable prerender checks passed. The packed SSR critical matrix passed in Chromium, Firefox, and WebKit after the runtime repairs.
- Built public declarations compiled the 120-Command application and a contextual update with no inference-depth failure.

The published-package check runs during production deployment after publication. The website release-input check evaluates a version-bumped release commit; neither is a PR gate.

## Deferred work

Whole-application test mode, controlled dependency services, test scheduling, and a Story/Scene-style application test DSL belong to a later workstream. Execution tests should use the application's real handlers and replace their external services. Explicit handler stubs can support orchestration tests that exercise result paths without executing those handlers.

- [ ] Add a Foldkit lint rule for individual handler Layer names. A Command binding initialized by `PlaceOrder.toLayer(...)` should be `PlaceOrderLayer` in production or `PlaceOrderTestLayer` for a test implementation. Permit feature-level `layer` bundles and re-exports. Cover qualified definitions, test fixtures, and an autofix before enabling the rule across first-party code. Extend the same convention to Subscription, Mount, and ManagedResource handlers where their definitions have stable names.

## Service assembly follow-up

- [x] Inventory concrete providers inside handlers, Flags, and feature bundles.
- [x] Confirm Typing Game's RPC client is provided at the application root and has application lifetime.
- [x] Move HTTP, storage, Crypto, and Search provider choices to application assembly while retaining real handlers.
- [x] Preserve distinct local and session storage service identities in the website.
- [x] Explain inline service requirements, effectful handler construction, and dependency substitution in active docs and generated app guidance.
- [x] Verify a shared service survives Commands and Subscription restarts and releases once at shutdown.
- [x] Verify real Search logic with a supplied search service and independent storage roles.
- [x] Run relevant workspace build, typecheck, test, lint, formatting, documentation, and browser gates.
- [x] Complete independent implementation, API, and documentation reviews.
- [x] Review the completed implementation in a committed diff before PR publication.

### Follow-up verification

- Full workspace build and all 52 TypeScript projects passed.
- Full workspace tests passed, including 3,010 Foldkit tests (one skipped) and 1,307 website tests.
- All 19 browser tests for the eight changed example applications passed serially with retries disabled.
- All 18 website browser tests passed serially and in parallel with retries disabled. Sidebar interaction waits for hydration and browser initialization.
- Lint, formatting, dead-code, and `git diff --check` passed.
- The real-handler service example compiled under strict TypeScript, and both Application Layers and Project Organization were inspected in the browser.
- Mutation checks confirmed the shared-service lifetime, Search substitution, and independent storage tests catch incorrect wiring.
- The WebSocket example uses the real lifecycle handler with a supplied constructor service. Four deterministic tests verify scoped closure and listener cleanup after interruption, readiness failure, timeout, and successful acquisition; a finalizer mutation makes all four fail.
- The prebundle source check excludes the test files omitted by the library build. Regression fixtures cover both excluded test imports and missing published imports.
- Current main's Effect lint checks, typed Schema operations, and relay fixes are integrated. Lifecycle callback inputs preserve their error types; rule exceptions cover validated runtime type-erasure boundaries and tests of their public contracts.
- Independent implementation and consumer API review, plus a separate documentation and naming review, found no unresolved issues after repairs.

## Release review

- [x] Review the public API and feature-level Layer composition from a consumer's perspective.
- [x] Audit active documentation, snippets, scaffolds, and published TSDoc for the final API.
- [x] Resolve any findings from the API and documentation reviews.
- [x] Run the repository's formatting, lint, dead-code, build, typecheck, test, and browser gates.
- [x] Review the full branch diff and changesets for durable migration guidance.

## Independent review

- [x] Review the committed implementation for type, context, and lifecycle defects.
- [x] Review the consumer API and application organization at framework scale.
- [x] Review naming, active documentation, snippets, and scaffold guidance against Foldkit conventions.
- [x] Resolve actionable findings and verify the repairs.
- [x] Review the resulting committed diff independently.

### Findings

- [x] Validate the server hydration handoff before acquiring application Layers. A stale page is contained even when a provided Layer would fail to build.
- [x] Share embed activity and previous-fiber sequencing across provided variants of one Element.
- [x] Preserve trailing context parameters in `Update.make`.
- [x] Align active Message namespaces, result names, handler names, and Subscription registration keys with Foldkit conventions.
- [x] Make organization snippets and scaffold guidance agree with their actual file layout and startup contract.
