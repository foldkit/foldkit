# Effect handler Layers

This is the working checklist for separating Foldkit effect definitions from their production implementations. Update the checkboxes as each slice is completed.

## Status

**Current milestone:** Complete. Command, Subscription, Mount, and ManagedResource handler Layers work through `Application.make`, `Application.makeElement`, and `Application.provide`. The website, first-party examples, Typing Game, and generated-app guidance compose production handlers by feature.

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

## Target surface

- `Command` definitions declare identity, arguments, result Messages, and interruption behavior. `toLayer` supplies an implementation.
- An application carries its unsatisfied Effect requirements until a Layer is provided. The application config does not own an app-wide `resources` Layer.
- Subscriptions retain record keys as registration identities and gain explicit, stable handler names. Their Model dependency logic stays with the definition; a Layer supplies the Stream factory. A name-only entry handles Streams without local Model dependencies. Lift and aggregation preserve the handler identity.
- ManagedResources retain Model-driven acquisition and release. A Layer supplies the acquire and release functions, while `managedResources` registers the lifecycle and result Messages with the application.
- Mount definitions retain their names and element-driven lifecycle. Layer-backed Mounts enter the application requirements through explicit registration because `view` does not expose handler requirements.

## Work items

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
- [x] Name individual handler Layers after their definitions (`PlaceOrderLive`); use feature-level `Live` for composition and re-exports.

### 4. Subscription and ManagedResource handlers

- [x] Add a named Subscription handler identity distinct from the record key. Preserve it through lift and aggregate. The current API has no rekey helper.
- [x] Reject distinct Subscription definitions that use the same handler name in one application.
- [x] Move Subscription Stream implementations into handler Layers without changing restart and keep-alive behavior.
- [x] Move ManagedResource acquire and release implementations into handler Layers without changing active-value access or release timing.
- [x] Migrate first-party page-owning Subscriptions and ManagedResources. The website, page-owning examples, and Typing Game use Layer-backed handlers where the implementation is app-owned.
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
  - `skills/generate-program` and active README guidance teach `Application.make`, `Application.makeElement`, and feature-composed `Live` Layers.
- [x] Verify feature Layer composition with the website's 27 production Commands, then migrate its application entry without listing every handler there. Documentation snippets account for another 51 definitions.
  - Each feature owns a `Live` Layer next to its update/lifecycle definitions. Features with multiple modules compose their local Layers and export one `Live` from their barrel.
  - `src/live.ts` composes feature Layers and service providers. `entry.ts` imports that one `WebsiteLive` value and calls `Application.provide` once; it never imports individual handler Layers.
  - The 14 site-shell Commands compose into boot, navigation, and preference Layers. The two Home phase delay Commands have distinct names.
- [x] Run workspace type checks, all Foldkit unit tests, focused example tests, and lint for the current slice.
- [x] Resolve API reference generator warnings about helper types exposed through the new public signatures.
- [x] Run the website build and browser smoke suite after its migration.
- [x] Run the full workspace build and TypeScript gates after the Element migration.
- [x] Run the website end-to-end suite after the Element migration.
- [x] Review the full diff for public API coherence and migration guidance.

## Verification snapshot

- Foldkit: 2,996 tests passed, 1 skipped.
- Workspace: all 52 projects passed TypeScript checks after building their local package dependencies.
- Weather, Stopwatch, and Managed Resource Layer examples: type checks and Story/Scene tests passed.
- Root and application lint, formatting, and `git diff --check` passed.
- Website: 1,301 unit tests passed across 29 files; TypeScript, build, and six browser smoke tests passed. Two browser tests timed out under parallel load, then passed serially with retries disabled.
- WebSocket Chat, Snake, Charting, Map, Counter, Counters, Crash View, and Web Components: targeted type checks and 105 existing tests passed.
- API Cache, Canvas Art, Form, Generative Art, Interrupting Commands, Personal Blog, Route Transitions, State Machine, and View Transitions: targeted type checks and 115 existing tests passed.
- Auth, Job Application, Kanban, Pixel Art, Query Sync, Routing, Shopping Cart, Slow Warnings, SSG, SSR, Todo, and UI Showcase: targeted type checks and 259 existing tests passed.
- Typing Game client: type check, 16 tests, production build, lint, and formatting passed with one composed `Live` Layer instead of an application `resources` field.
- Query: 46 Foldkit tests and 16 API Cache Query tests passed. Foldkit, website, and the example type checks passed.
- Embedded Element assembly: 64 focused Foldkit runtime tests passed. The Embedding example type check and six tests passed.
- The final full workspace build and TypeScript checks passed. Foldkit's full suite passed with 2,996 tests and one skipped after replacing the `resources` configuration tests with application Layer lifecycle tests.
- Website browser suite: 18 tests passed serially with retries disabled after the runtime change.
- Website TypeScript check and production build passed with the updated Runtime, Resources, and ManagedResource pages.
- The API reference generator succeeds without warnings after documenting private signature helpers in its exclusion list.

## Deferred work

Whole-application test mode, controlled handler Layers, test scheduling, and a Story/Scene-style application test DSL belong to a later workstream. This work establishes stable identities and replaceable execution boundaries for them.

- [ ] Add a Foldkit lint rule for individual handler Layer names. A Command binding initialized by `PlaceOrder.toLayer(...)` should be `PlaceOrderLive` in production or `PlaceOrderTest` for a test implementation. Permit feature-level `Live` bundles and re-exports. Cover qualified definitions, test fixtures, and an autofix before enabling the rule across first-party code. Extend the same convention to Subscription, Mount, and ManagedResource handlers where their definitions have stable names.
