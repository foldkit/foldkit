# Effect handler Layers

This is the working checklist for separating Foldkit effect definitions from their production implementations. Update the checkboxes as each slice is completed.

## Status

**Current milestone:** Command, Subscription, Mount, and ManagedResource handler Layers work through `Application.make` and `Application.provide`. The website and representative lifecycle examples compose production handlers by feature.

**Next implementation:** Migrate the 13 remaining first-party example entries, finish active inline-handler snippets, then retire the old application `resources` configuration.

**Scope:** Production handler Layers and application assembly. Whole-application testing APIs are deferred.

| Milestone                                 | Status                 | What the user can use afterward                                                       |
| ----------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| Command handlers                          | Implemented, verifying | Define a Command separately from its handler Layer.                                   |
| Application assembly                      | Implemented, verifying | See unsatisfied requirements on an application and provide Layers before starting it. |
| Subscription and ManagedResource handlers | Implemented, verifying | Replace implementations while preserving Model-driven lifecycles.                     |
| Mount boundary                            | Implemented, verifying | Register Layer-backed Mount definitions to carry their requirements.                  |
| Migration and verification                | In progress            | First-party apps, templates, and active docs use the final API.                       |

## Target surface

- `Command` definitions declare identity, arguments, result Messages, and interruption behavior. `toLayer` supplies an implementation.
- An application carries its unsatisfied Effect requirements until a Layer is provided. The application config does not own an app-wide `resources` Layer.
- Subscriptions retain record keys as registration identities and gain explicit, stable handler names. Their Model dependency logic stays with the definition; a Layer supplies the Stream factory. Lift and aggregation preserve the handler identity.
- ManagedResources retain Model-driven acquisition and release. A Layer supplies the acquire and release functions, while `managedResources` registers the lifecycle and result Messages with the application.
- Mount definitions retain their names and element-driven lifecycle. Layer-backed Mounts enter the application requirements through explicit registration because `view` does not expose handler requirements.

## Work items

### 1. Type and lifecycle proof

- [x] Prove a Layer-backed Command contributes a synthetic handler service to an inferred update return.
- [x] Add `Update.make` to validate update results and infer the union of Command handler requirements.
- [ ] Migrate explicit `Message.match<Update.Return<...>>` and Step annotations where their `R` would otherwise be fixed to `never`. The website's nested folds and update functions are migrated.
- [x] Prove an application can retain and satisfy requirements from init, update, Subscriptions, and ManagedResources without manually listing each service generic.
- [x] Prove client-only application requirements from init, update, and Subscriptions survive Layer provision, including dependencies introduced by a handler Layer.
- [x] Prove handler Layers can capture construction context and merge it with the execution context, with an explicit duplicate-service precedence rule.
- [x] Check that Command Message lifting preserves handler requirements and Command identity. The existing Submodel fold type tests cover service unions; a layered Submodel example remains part of migration.
- [x] Set an application-wide identity and collision rule for handler names before migrating shared Submodels. Distinct registered Subscription and ManagedResource definitions with the same name fail at `Application.make`; Command Layer mismatches fail when the Command runs because Commands are not registered at assembly. Lifted uses of the same definition can share its Layer.
  - The website's note player and async counter demos use distinct handler identities for their phase delay Commands.

### 2. Application assembly

- [x] Separate application definition, Layer provision, and host startup for `run`, `hydrate`, and `embed`.
- [x] Add `Application.make` and chainable `Application.provide` for client-only applications without Flags or routing.
- [x] Extend application assembly to Flags and routing, including hydration and embed startup through the provided runtime internals.
- [ ] Remove `resources` from application configuration after the replacement path works.
- [x] Keep runtime-provided ManagedResource accessors and Port channels available to handlers.
- [x] Place handler Layer construction after runtime-provided services exist. A Layer can acquire a Model-driven ManagedResource accessor while it is constructed.

### 3. Command handlers

- [x] Add a synthetic service for Layer-backed Command definitions and `toLayer(handler | Effect<handler>)`.
- [x] Preserve Command identity, argument capture, result Message mapping, and interruption. Existing Command and DevTools tests pass.
- [ ] Migrate first-party Command definitions and application Layers. The website's 27 production Commands are migrated.

### 4. Subscription and ManagedResource handlers

- [x] Add a named Subscription handler identity distinct from the record key. Preserve it through lift and aggregate. The current API has no rekey helper.
- [x] Reject distinct Subscription definitions that use the same handler name in one application.
- [x] Move Subscription Stream implementations into handler Layers without changing restart and keep-alive behavior.
- [x] Move ManagedResource acquire and release implementations into handler Layers without changing active-value access or release timing.
- [ ] Migrate first-party Subscriptions and ManagedResources. The website, Stopwatch, WebSocket Chat, Snake, and Managed Resource Layer examples are migrated.
- [x] Migrate SSR and SSG scaffolds to `Application.make`; the SSR cookie-writing Command has a handler Layer.

### 5. Mount boundary

- [x] Document the `view` type boundary that prevents Mount handler requirements from joining the application `R` channel.
- [x] Choose explicit Mount registration rather than propagating requirements through `Html` and `Document`.
- [x] Add `Mount.toLayer` for one-shot and streaming definitions, preserving element-driven acquisition, teardown, and Message lifting.
- [x] Infer registered Mount requirements into `Application.make` and validate rendered Mounts before patching the DOM.

`view` returns a `Document`, and `MountAction.f` currently returns a Stream with no exposed `R`. A Mount used only inside `view` therefore cannot add a handler requirement to `Application.make` by inference from update or Subscriptions. The application will register its Layer-backed Mount definitions in a `mounts` collection. That collection contributes handler requirements to the application's `R` channel. A pre-patch check of rendered Mount identities will reject unregistered Layer-backed actions, including ones revealed by later Model states. An unused registration is valid because conditional views are normal. Inline Mounts need no registration.

### 6. Verification and publication

- [ ] Complete active documentation, examples, and template migration for the final public API.
  - The website and 20 example entries use `Application.make`. Their replaceable effects use handler Layers; 13 example entries remain to migrate.
  - Runtime entry, Resources, and ManagedResource teaching snippets use `Application.make` and `toLayer` where those APIs apply.
- [x] Verify feature Layer composition with the website's 27 production Commands, then migrate its application entry without listing every handler there. Documentation snippets account for another 51 definitions.
  - Each feature owns a `Live` Layer next to its update/lifecycle definitions. Features with multiple modules compose their local Layers and export one `Live` from their barrel.
  - `src/live.ts` composes feature Layers and service providers. `entry.ts` imports that one `WebsiteLive` value and calls `Application.provide` once; it never imports individual handler Layers.
  - The 14 site-shell Commands compose into boot, navigation, and preference Layers. The two Home phase delay Commands have distinct names.
- [x] Run workspace type checks, all Foldkit unit tests, focused example tests, and lint for the current slice.
- [x] Resolve API reference generator warnings about helper types exposed through the new public signatures.
- [x] Run the website build and browser smoke suite after its migration.
- [ ] Run full build and end-to-end verification gates after the remaining migrations.
- [ ] Review the full diff for public API coherence and migration guidance.

## Verification snapshot

- Foldkit: 2,996 tests passed, 1 skipped.
- Workspace: all 52 projects passed TypeScript checks after building their local package dependencies.
- Weather, Stopwatch, and Managed Resource Layer examples: type checks and Story/Scene tests passed.
- Root and application lint, formatting, and `git diff --check` passed.
- Website: 1,301 unit tests passed across 29 files; TypeScript, build, and six browser smoke tests passed. Two browser tests timed out under parallel load, then passed serially with retries disabled.
- WebSocket Chat, Snake, Charting, Map, Counter, Counters, Crash View, and Web Components: targeted type checks and 105 existing tests passed.
- API Cache, Canvas Art, Form, Generative Art, Interrupting Commands, Personal Blog, Route Transitions, State Machine, and View Transitions: targeted type checks and 115 existing tests passed.
- Website TypeScript check and production build passed with the updated Runtime, Resources, and ManagedResource pages.
- The API reference generator succeeds without warnings after documenting private signature helpers in its exclusion list.

## Deferred work

Whole-application test mode, controlled handler Layers, test scheduling, and a Story/Scene-style application test DSL belong to a later workstream. This work establishes stable identities and replaceable execution boundaries for them.
