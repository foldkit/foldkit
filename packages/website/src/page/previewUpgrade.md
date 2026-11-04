# Upgrade a Previous Preview

## Overview

This guide covers upgrades from the Block previews listed below to the candidate represented by this website deployment. Identify the installed snapshot before choosing its migration path.

| Installed canary source suffix                    | Upgrade path                                                                                                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `90746b32d2ca`                                    | [Upgrade from 90746b32d2ca](#upgrade-from-90746b32d2ca). Adopt the Block declaration and ordinary implementation Layer below, then upgrade Effect and its platform packages.        |
| `f3be22cfeefe`                                    | [Upgrade from f3be22cfeefe](#upgrade-from-f3be22cfeefe). Adopt the Block declaration and ordinary implementation Layer below.                                                       |
| `1f6776fa7ece`                                    | [Upgrade from 1f6776fa7ece](#upgrade-from-1f6776fa7ece). Replace preparation and assembly with the Block declaration and ordinary implementation Layer below.                       |
| `1fbeaffe6563`                                    | [Upgrade from 1fbeaffe6563](#upgrade-from-1fbeaffe6563).                                                                                                                            |
| `c701daa80af1`, `396b19976386`, or `bfd880b1e6ca` | Follow the complete guide, including the application boundary, Step composition, and UI call-site changes. These three snapshots share the same application API for this migration. |

The older-preview baseline was checked at Coverchart checkpoint `084f1c94f38137837e9609c63ef08176ad607c9a`, with `foldkit@0.168.0-canary.bfd880b1e6ca` and its installed Foldkit packages aligned to that snapshot.

The candidate is not available merely because this page exists. An uploaded integration preview identifies itself in the page banner and in the same-origin [`preview-release.json`](/preview-release.json). Use the exact source commit and package versions from that manifest. Do not guess a version, npm tag, or package URL.

If the project uses a stable release or an earlier preview architecture, start with [Migrate to the Preview](/preview-migration). The current [Block](/core/block), [Runtime](/core/runtime), and [server rendering](/core/server-rendering) guides describe the target architecture in full.

## Select the Installed Source and Target

### Identify the installed preview

Read both `package.json` and the package manager lockfile. `package.json` records the requested Foldkit packages; the lockfile records the versions the project actually resolves. A canary version ends in `-canary.<source-hash>`.

Compare the source hash suffix across `foldkit`, `@foldkit/ui`, and every other Foldkit package the project declares. Their numeric version prefixes can differ because each package has its own version line. The source hash must agree. A project with different source hashes has a mixed snapshot and should be aligned before code migration.

Read migration guidance and [Project Organization](/patterns/project-organization) on the deployment matching the target snapshot. Their rendered Markdown is also available by appending `.md` to the page path. GitHub source contains `::Snippet` references; the deployed Markdown includes those snippets' contents.

### Install one coherent target

On an uploaded integration preview, the banner identifies the verified release and links to its exact package versions. The manifest's `packages` object is the authority for the exact version of every package in the snapshot. Update every Foldkit dependency the project declares to the corresponding exact version, update the lockfile with the project's package manager, and confirm that the resolved canary suffixes all name the manifest's `sourceCommit`.

Do not combine candidate packages with packages from the previous preview. Internal package dependencies are tested as one commit-addressed set.

If the project enforces pnpm's `minimumReleaseAge`, a newly uploaded preview may be too recent to install. Preserve that policy and add only the exact `name@version` entries from the verified manifest to `minimumReleaseAgeExclude`. Do not disable the age check globally.

### Verify an npm workspace upgrade

Update the Foldkit declarations in every application and library workspace that shares the preview. An install targeting only one workspace can report "up to date" while another workspace still requests an older snapshot. Run the installation from the workspace root after updating those declarations, then inspect the resolved graph:

::Snippet{name="previewNpmResolvedPackages" label="Inspecting resolved npm packages"}

Compare every installed Foldkit canary suffix with the target manifest's `sourceCommit`, including nested workspace dependencies. A successful `npm ls` exit does not establish that all packages use one snapshot.

Inspect the physical Effect installations too:

::Snippet{name="previewNpmEffectLocations" label="Inspecting Effect installation locations"}

The result lists installed Effect copies and their locations. Check that the application and its Foldkit packages resolve the same installation. A workspace can contain other copies used by separate applications or tools; inspect the dependency tree to establish which copies enter the application graph. Choose matching Effect and platform versions as described in [Effect compatibility](#effect-compatibility), then repeat both checks.

After updating manifests and the lockfile, run `npm ci` to verify that the lockfile reproduces the intended graph. Preserve the existing lockfile while diagnosing an upgrade; an older workspace constraint can explain a retained version without a corrupt lockfile. If a prerelease lockfile still cannot resolve the declared target, retain the npm version, manifests, lockfile and error for a reproduction before attempting a wider lockfile regeneration.

## Adopt Layer-based Block construction

This candidate establishes each public Block contract before its implementation. Keep your Model, Message, child relationships, and transition behavior while changing completion:

1. Declare each concrete feature once as `FooBlock = Block.make(...)`. Retain its stable unique `key`, Model, Message, Init tuple, Context, view, operation, and effect contracts.
2. Use that same `FooBlock` for local helpers and parent authorship. Remove a separate Definition and its `.contract` projection. Parent Schemas and Bindings use `FooBlock` directly.
3. Complete the implementation with `layer = FooBlock.makeLayer(Effect.gen(function* () { ... }))`. Yield each registered Binding and return the acquired connections as `children`, alongside the portable builders and local lifecycle and handler declarations. A leaf returns `children: []`.
4. Provide child implementations through ordinary Layer composition: `.pipe(Layer.provide(Child.layer))`.
5. Pass `{ block: ApplicationBlock, layer }` to Program and Server. Use the same pair for normal `story` and `scene` tests, followed by `init(...args)` or `given(model)`. Use `withBlock` only for fixtures needing direct pure functions.
6. Check emitted declarations and a relocated consumer when publishing a package. Ordinary application exports need no `FromAssembly*` annotations.

::Snippet{name="blockFeatureExports" label="Contract-first Block completion"}

The constructor builds the executable graph. Initialization remains deferred, state stays in the Model, and ordinary request Services stay in Command handler constructors. See [Block](/core/block) and [Project Organization](/patterns/project-organization) for the complete layout.

Keep canonical local handlers in the implementation's `EffectsLayer`. An attached handler normally receives host-selected HTTP, storage, or transport Services. When the integrator owns specific handler implementations, the constructor can instead return their original definitions under `hostHandlers`. Select providers for every listed definition with `layer.pipe(FeatureBlock.provideHandlers(HandlersLayer))`, using those definitions' `toLayer` methods. Provider Services and constructor errors must fit the Block's declared effects contract. Selection remains passive.

The passive public child contract does not expose the implementation's private handler inventory. Apply handler selection to its ordinary construction Layer with the Block's `provideHandlers` helper. Query and other generic family APIs can also expose a checked host-handler selector. See [host implementations](/core/layers#host-implementations-for-reusable-features).

## Create standard child-array occurrences

For a required child array that needs only occurrence keys and child state, the candidate adds `ChildBlock.Instance` and `Binding.create({ key, args })`. Declare `Schema.Array(ChildBlock.Instance)` and bind `{ field, key: 'key', childField: 'model' }`. Append creation requests through the owning `makeFieldsStep`; checked execution initializes them before subsequent Steps and retains every child init Command. The Model stores ready `{ key, model }` Instances.

Creation-bearing field results are opaque connected recipes until checked execution. Ordinary field changes remain Model-only. Seed ready fixtures with `ChildBlock.Instance.make`; decoding a ready snapshot does not rerun init. The existing [Counters example](/example-apps/counters) reuses one creation transition during startup and update. See [child creation](/core/init-and-flags#creating-child-instances) for duplicate-key rejection and occurrence lifecycles.

This addition covers standard string-keyed top-level arrays. Keep existing initialization paths for Option fields, maps, wrappers with extra metadata, or identity stored directly in the child Model. No storage migration is required.

### Rename a conflicting family member

`Instance` is now a reserved Block member. If an advanced generic library factory supplies a convenience named `Instance` through `BlockFamily.resolveFamily`'s `members` record, rename that convenience and update its callers. The resolver belongs to Foldkit’s internal library-authoring entry; ordinary application Blocks need no family machinery. It cannot replace the ready Instance Schema. Both TypeScript and runtime validation reject the conflicting member, including JavaScript callers with erased types. See [Generic Blocks](/core/block#generic-blocks).

## Upgrade from 90746b32d2ca

The source snapshot is `90746b32d2ca8bc0476de7a051ace396ca590ae0`. It includes the earlier Block construction API and the Machine, Query, and UI factory changes. Adopt the Block declaration and ordinary construction Layer described above, and upgrade Effect and its platform packages to the supported 4.1 minor together. Follow [Effect compatibility](#effect-compatibility), including the UUID service migration and dependency-graph checks.

## Upgrade from f3be22cfeefe

The source snapshot is `f3be22cfeefed437164ad614d08b16d9000e0703`. It already includes checked `Block.assemble(prepare)` exports, record-only `makeUpdate`, focused Step producer callbacks, and aggregate ManagedResource Layers. Keep the existing child graph and follow [Layer-based construction](#adopt-layer-based-block-construction) for the target completion API.

After installing one coherent target, replace standalone `makeMapBinding` calls with the [parent Block method](#move-map-bindings-to-their-parent-block). The `foldkit/mapBinding` import is removed. Applications without map Bindings need no API migration for this change.

For retained children stored directly in Record or HashMap fields, optionally use [makeInitIfMissingStep](/core/init-and-flags#dynamic-storage-helpers) to preserve an existing child or initialize a missing one with its Commands. [Route.parsePathWithFallback](/core/routing-and-navigation#parse-relative-paths) is also available for decoding origin-relative paths; it does not require changing existing Routes.

The optional [makeStep.fromMessage](/core/block#featureblockmakestep) adapter lets a Message-only producer select or compose Steps without an unused Model parameter. Inline handler records infer the Message payload; extracted producers need an exact variant annotation. Step validation also checks every possible result branch, so an invalid Model or result channel cannot be hidden beside a valid branch.

Run [the upgrade checks](#verify-the-upgrade), including public declaration output where applicable. The older snapshot sections below describe migrations already present in `f3be22cfeefe`.

### Effect compatibility

This candidate requires Effect 4.1. Published peers accept patch updates through `~4.1.0` for `effect` and `@effect/platform-browser`. Repository and generated-app dependencies remain exactly pinned to 4.1.0 for reproducible verification. Effect minor releases can change APIs, so each minor upgrade is reviewed before Foldkit widens its supported range. The 4.0.0 and 4.0.6 pairs supported by earlier previews are outside this candidate's range.

The Node adapter, Vite plugin, and DevTools MCP require Node.js 22.19.0 or newer. Keep the scaffolder's separate engine requirement when generating an app.

Upgrade Effect and every declared platform package together within the supported minor. Pin an already declared `@effect/platform-browser` dependency to the same tested version as Effect, preserving its dependency placement. Keep one resolved Effect runtime: a successful install can still leave nested copies in a workspace.

Effect 4.1 replaces `Crypto.Crypto` with the services under `effect/crypto`. For UUID generation, import `SecureRandom`, capture `SecureRandom.SecureRandom` in the handler constructor, and call its `uuidV4()` method inside the invocation Effect. Supply `BrowserCrypto.layerSecureRandom` at the application root. UUID generation has no typed error channel, so it no longer needs `Effect.orDie`, a catch, or a paired failure Message. See [deferred execution boundaries](/tooling/linting#deferred-execution-boundaries).

An npm workspace root can select the transitive browser-platform peer with this `overrides` entry, merged into its existing `package.json`. Use it when platform-browser is not already a direct dependency; a direct dependency should carry the matching exact pin itself:

::Snippet{name="previewNpmPlatformOverride" label="Selecting the transitive browser platform version"}

This override selects platform-browser 4.1.0 for an application using Effect 4.1.0. It does not widen Foldkit's supported minor. Verify the installed graph with the [npm workspace checks](#verify-an-npm-workspace-upgrade).

### Authoring and lifecycle fixes

Inline Model-aware `makeStep` producers now infer the exact Message from their handler-record entry, including `.withContext`. Redundant Message parameter annotations can be removed at those inline sites. Extracted Steps retain their own precise parameter contracts. See [handlers and Steps](/core/update#choosing-between-handlers-and-steps).

Contextual update records now accept compatible Steps and Binding operations directly, including records that mix them with callback handlers. Remove an adapter such as `model => close(model)` when it only forwards to the Step. Keep callbacks that map payloads, derive arguments or supply context.

Extracting registration evidence from returned Commands now avoids TS2589 in the reported large Root composition, while retaining registration checks. This does not establish a general limit on the number of Blocks or remove all compiler costs in large graphs.

Scene follows renderer element identity when tracking Mount lifetimes. A replaced element ends its old Mount; a patched element keeps its original Mount even if its `OnMount` attribute changes. Review Scene tests that resolved a Mount which never starts in the browser. Runtime teardown also releases the original Mount when its element is removed after dropping `OnMount`.

`Scene.unhover(target)` now exercises hover exit through the element's `OnMouseLeave` handler, falling back to `OnMouseOut`. See [Scene interactions](/testing/scene#interactions).

Subscription entries can declare a Model-based `when` gate. Scene adds explicit activity assertions; queued-event delivery stays supported. See [Subscriptions](/core/subscriptions) and [Scene testing](/testing/scene) for the contracts. Handler constructors still run at Runtime startup and retain their Service requirements and errors, even behind a closed Stream gate.

SSR development reloads recreate Block declarations with their implementation Layers. Server entries that own long-lived resources can register an HMR disposal callback. See [server entry cleanup](/core/server-rendering#releasing-resources-when-the-server-entry-reloads) for setup and reload limits.

### UI Block factories

Rename `create` to `makeBlock` on Listbox, Combobox, Menu, RadioGroup, Tabs, and VirtualList, including the Listbox and Combobox Multi variants. Rename `Toast.make` to `Toast.makeBlock` too. Type parameters and Schema arguments stay the same; the old factory names have no compatibility aliases.

Each factory returns a passive public Block contract. Declare it once at module scope, bind that value in the parent, and provide the component's implementation Layer to the parent's construction Layer. Calling the factory does not initialize an occurrence or start effects. After graph acquisition, parent init calls the child's initializer and retains its Model and Commands. See [Selection Blocks](/ui/selection-blocks#make-block-factory), [Toast](/ui/toast), and [VirtualList](/ui/virtual-list) for current usage.

### Machine authoring

The experimental [Machine API](/core/machine) now binds State, Message, and optional Context Schemas once with `Machine.makeDefinition`. Author inline transitions through its bound helpers, use `makeGuard`, `makeHandler`, and `makeTransitions` for extracted logic, and complete the checked table with `Definition.makeMachine`. This brings Machine authoring into the same authoring vocabulary as Blocks, with exact source-state and Message narrowing and preserved Command requirements.

Replace the previous curried `Machine.define` and standalone authoring helpers with the Definition methods. Pure execution, folding, and graph analysis remain available. Machine's authoring changes are part of testing API consistency during the Blocks + Effect Layers preview.

### Query and VirtualList additions

The domain-search showcase, `foldkit-domains`, also motivated additional capabilities on this preview branch:

- Experimental [Query and KeyedQuery](/core/query) support freshness-aware loading, targeted cancellation, and opt-in accepted-completion OutMessages. KeyedQuery adds bounded retention of settled entries and pending-request inspection. Freshness expiry preserves retained display data; pending entries are protected from eviction and can temporarily exceed the settled-entry limit. Existing defaults remain unchanged. Persisted experimental Query Models need migration for the new freshness and recency metadata.
- [VirtualList](/ui/virtual-list) adds continuous upward history loading, semantic table rows, ancestor or Window scroll ownership, and positioned ordinary rows. Parent policies must handle the new `ApproachedLoadedStart` and `EndedContainerScroll` OutMessages. History uses Self scrolling and spacer rows; table rows use external scrolling and spacer rows. The guide covers the supported combinations and parent-owned fetching.

These additions support that application and are included in the preview's release notes. Adopting them is optional for a Blocks + Effect Layers migration.

## Upgrade from 1f6776fa7ece

The source snapshot is `1f6776fa7ececa766188df5201eefec6ba781b5d`. It already uses `Composition.prepareBlock`, checked `Block.assemble(prepare)` exports, the `make*` Definition factories, and `Program.make` or `Program.makeElement`. Keep the existing child graph and follow [Layer-based construction](#adopt-layer-based-block-construction) for the target completion API. Coverchart's starting installation uses `foldkit@0.169.0-canary.1f6776fa7ece`; identify your own starting packages from the lockfile.

After installing one coherent target:

1. Replace every collection argument to `FeatureBlock.makeCommandsStep` with the [callback form](#pass-a-callback-to-makecommandsstep). The collection overload is removed.
2. Convert callback-authored updates to exhaustive [handler records](#preserve-update-handler-contracts). Use `makeUpdate({})` without local Messages and `makeUpdate.withContext` for dispatch context. The callback overload is removed.
3. Preserve connected result channels. A single handler mixing connected Binding recipes with raw local results must use Block-owned Steps for those local branches. Keep the complete result of an OutMessage-producing operation instead of composing it where that OutMessage would be discarded.
4. Replace value-taking `FeatureBlock.makeOutMessageStep` calls with a [producer callback](#use-focused-step-producers). The value overload is removed. The field, Command, and OutMessage helpers now share Model-aware, Message-aware, and `.fromMessage` forms.
5. Rename any ManagedResource registry entry key named `layer`; that key now holds the aggregate handler Layer. A fully attached owned registry exposes [managedResources.layer](/core/managed-resources); mixed or host-owned registries use explicit entry providers.
6. If the application uses DragAndDrop, add `StartedKeyboardDrag` and `ChangedKeyboardTarget` to exhaustive OutMessage policies. These report keyboard pickup and the proposed target; handle them in parent policy or use the owning Block's no-op fold handler when no reaction is needed. Custom keyboard-move handlers and manually constructed `CompletedResolveKeyboardMove` Messages must echo the invocation's `keyboardDragGeneration`. The public Story helper derives that generation from the selected pending Command. The [DragAndDrop guide](/ui/drag-and-drop) shows the current contract.
7. Check keyed Command cancellation policies. `toKey` now receives only the own fields selected by `keyFields` on both invocation and interruption. It cannot read unrelated invocation args. Preserve precise selected fields in extracted `Command.InterruptOption<Args, Key>` annotations; broad policies must handle uncertain fields as optional. Narrow policy unions before construction. See [keyed interruption](/core/commands#choosing-an-interruption-key).
8. Run [the upgrade checks](#verify-the-upgrade), including tests and public declaration output where applicable.

Effect `DateTime` and `TimeZone` values can now pass through ViewInputs without converting them to primitives. Added nested application callbacks remain rejected. `Update.withOutMessage` also retains its OutMessage after homogeneous or nested connected Step combinations. These declaration fixes require no new API names or data conversions.

`Story.message` now permits another fact while Commands are pending. Pending Commands retain their identity and still require explicit resolution before the Story ends. This lets concurrency tests keep the actual pending work instead of constructing a pending Model. Scene retains its separate interaction and Mount checks. See [concurrent Story delivery](/testing/story#multi-step-flows).

Reciprocal Binding policies now resolve converging paths without repeatedly expanding the same policy graph. The reported twelve-Binding compiler-depth case has regression coverage. This does not establish an unlimited graph size or eliminate all editor latency.

The following additions are optional:

- Paths stored in query parameters can use [Route.parsePathWithFallback](/core/routing-and-navigation#parse-relative-paths). Decode return locations through the query Schema and store typed Routes in the Model; application selectors can then use those values directly.
- Schema-backed Record and HashMap child fields can use [ParentBlock.makeMapBinding](/core/block#keyed-map-fields), removing repeated lookup and replacement configuration. Existing standalone calls need the [map Binding migration](#move-map-bindings-to-their-parent-block). General keyed Bindings remain supported for custom relationships.
- A closed, fully attached ManagedResource registry supplies its handler recipes through [managedResources.layer](/core/managed-resources), matching Subscriptions. Empty registries supply `Layer.empty`; mixed attached/host-owned registries require explicit provider selection.
- Story and Scene helpers can inspect captured Command arguments through [Command.argsOf](/testing/story#inspect-captured-command-arguments), matching the original Definition's source identity without changing the pending Command or selecting an occurrence.
- Parent Stories can wrap a child fact with [Story.messageFrom](/testing#send-a-child-fact-without-a-view), using the exact Binding without view setup or fabricated envelope fields. Existing Command and Subscription replay paths remain appropriate for their respective sources.
- Whole tagged child variants can use [makeVariantBinding](/core/block#whole-tagged-variants). [Dynamic storage helpers](/core/init-and-flags#dynamic-storage-helpers) set singular children, append initialized keyed arrays, and insert direct-value map entries without repeating storage writers.
- Story can [derive a Message from the current Model](/testing/story#build-a-message-from-the-current-model) with `messageWith` or [deliver a decoded registered Subscription Message](/testing/story#deliver-a-subscription-message) with an acquired fixture’s `Subscription.from(block.subscriptions).emit`.
- Scene can [keep one exact ordinary Command pending](/testing/scene#pending-command-rules) across another interaction with `Command.keepPending`. The Command remains visible to assertions and resolution, and must resolve before the Scene ends.

The new Workspace example demonstrates a larger application, and named public UI Block headers improve declaration serialization. Those changes do not require a new application architecture. Applications with public declaration output should still [verify their own emission](#emit-public-block-declarations); a successful application source check alone does not establish declaration portability.

## Upgrade from 1fbeaffe6563

The verified source is `1fbeaffe656303b44d8fd20c18d598f08014a5c9`. Its root already uses the previous `assembleBlock` preparation method and `Program.make` or `Program.makeElement`. Replace that completion sequence with [Layer-based construction](#adopt-layer-based-block-construction), while retaining the existing graph and host behavior:

- Child policies use `withOutMessagePolicy`.
- Animation content uses `toView`.
- Toast tests use the selected public Block's helper.
- Step composition uses `Update.combineSteps`.

After installing one coherent target, make the changes used by your application:

1. Declare the independent public contract, complete the implementation through `FeatureBlock.makeLayer`, and supply its child implementation Layers. Remove the old preparation producer and assembly annotation.
2. Apply the [Definition and Namespace factory renames](#rename-definition-authoring-factories). The old names have no compatibility aliases.
3. Convert existing `makeCommandsStep` collection arguments to the [required callback form](#pass-a-callback-to-makecommandsstep).
4. Replace `Animation.defaultLeaveCommand` with the [bound leave-settlement operation](#replace-the-standard-animation-leave-helper) wherever the application uses standard CSS settlement. Keep custom settlement Commands for additional signals.
5. Update any affected [UI trigger and focus tests](#update-ui-trigger-and-focus-tests).
6. Apply the [Vite security patches](#vite-security-patches) to affected installed development tooling.
7. Check [update handler contracts](#preserve-update-handler-contracts) and [public declaration boundaries](#emit-public-block-declarations) for the code the project contains.
8. Run [the upgrade checks](#verify-the-upgrade). Assembly now rejects incompatible same-named Command handler contracts inside generic Block factories. Correct the owning definitions or handler Layers when this exposes invalid wiring.

The independent public contract keeps parent Model Schema access separate from the implementation graph. Existing `makeCommandsStep` callers must also adopt its callback argument. [Native TypeScript tooling](#native-typescript-tooling) remains a separate setup choice.

### Update UI trigger and focus tests

Popover, Menu, and Listbox report trigger clicks as `ClickedButton`. Include that fact in exhaustive component Message matchers and update Scene expectations that previously expected an open or close Message from a trigger click. The component's update decides whether to open or close from its current Model. Parent coordination uses Binding operations and OutMessage policies.

For a Popover with the default focus policy, use `Scene.focusLeave(panel)` instead of `Scene.blur(panel)` when testing dismissal as focus leaves the panel. Moving focus between the panel and its descendants keeps it open. With `contentFocus: true`, the application owns focus and dismissal.

Optional `makeVariantBinding` from `foldkit/variantBinding` replaces manual accessors when a child occupies one complete tagged member of the parent `Schema.Union`. Include the actual child Model Schema in that union. Parent update still owns variant switches and explicit initialization. See [whole tagged variants](/core/block#whole-tagged-variants).

The optional `foldkit/bindingInit` module adds `initAndSet` for required/optional direct fields and exact key/child Option wrappers, `initAndAppend` for arrays with an existing `init.instances`/`init.toItem` policy, and `initAndInsert` for direct-value Record/HashMap storage. Pass the Binding, current parent Model and `{ args }`, adding `key` for keyed storage. Append and insert reject occupied keys. Keep explicit initialization for additional wrapper metadata, sibling changes, parent Commands, or whole tagged variants. See [dynamic storage helpers](/core/init-and-flags#dynamic-storage-helpers).

For Record/HashMap fields storing child Models directly, `makeInitIfMissingStep(Binding, { key, args })` replaces a separate membership check and insertion when existing children should be retained. It returns a connected Step that checks the Binding's field when applied, preserving an existing child or retaining all init Commands for a missing one. Both paths require the registered Binding.

## Update the Application Boundary

This section applies to `c701daa80af1`, `396b19976386`, and `bfd880b1e6ca`.

### Complete an ordinary root Block

Declare the root's unique key, Init, Model, Message, and view contract in `ApplicationBlock`. Complete it with `ApplicationBlock.makeLayer`, yielding registered child Bindings and returning their connections under `children`. Export the returned ordinary `layer` and provide child implementations with `Layer.provide`. Program and Server receive `{ block: ApplicationBlock, layer }`.

::Snippet{name="blockFeatureExports" label="Independent contract and checked implementation"}

Use a Document view for `Program.make` and an Element view for `Program.makeElement`. Importing the Block declaration or Layer does not construct its graph or run init.

### Create the browser Program

Create the browser host in `entry.ts`. Use `Program.make` for a page-owning application or `Program.makeElement` for an application scoped to its container. Pass `block: ApplicationBlock` and its construction `layer`, alongside the container, Flags, routing, DevTools and other browser host options. Supply ordinary Services with `program.provide(ApplicationLayer)` before starting the Runtime.

`Program.make` needs a `Document` view; `Program.makeElement` needs `Html`. Give a host-created container a unique, nonempty `id` before passing it to the Program constructor. See [the Runtime guide](/core/runtime) for the view and Flags differences.

::Snippet{name="applicationEntryPoint" label="Starting the browser Program"}

Replace `devTools: { Message: ApplicationBlock.Message }` with `devTools: { dispatch: true }` when an external MCP client should discover and dispatch Messages. Program derives the dispatch Codec from the acquired root executable, including generated child envelopes. Omitting `devTools` keeps development inspection enabled with external dispatch disabled. `devTools: false` disables the DevTools store, overlay, and browser bridge.

Remove annotations and imports that use the old loose root types from `Runtime`:

- `ApplicationConfig` and `ApplicationConfigWithFlags`
- `RoutingApplicationConfig` and `RoutingApplicationConfigWithFlags`
- `ElementConfig` and `ElementConfigWithFlags`
- `ApplicationInit`, `RoutingApplicationInit`, and `ElementInit`
- `MakeRuntimeReturn`

The Block declaration supplies public contracts, Composition supplies portable builders, and the acquired executable supplies callable behavior. Use `Program.Program`, `Program.Element`, or `Program.Runnable` when a public signature needs to describe a browser host value. Server rendering has separate host configuration types and keeps them.

Declare a same-named decoded type immediately below each Schema, with no blank line, and use that alias in explicit value annotations. For example, put `type Model = typeof Model.Type` on the next line after the Model Schema, then annotate with `Model`. Use `typeof Model` when a helper needs the Schema type; ordinary app exports need no assembly header. Across a child boundary, derive a named alias from the public Block declaration, such as `type ChildModel = typeof ChildBlock.Model.Type`. Let Block-owned helpers and Composition callbacks infer their owned parameters. See [Schema and type organization](/patterns/project-organization#file-layout).

Canonical routing Messages can be passed directly when their payloads are `{ request }` and `{ url }`. Keep a callback when the application maps either value into a different payload.

### Pass the Block and Layer to the server {#pass-the-completed-block-to-the-server}

`Server.renderToString` receives `{ block: ApplicationBlock, layer }`, selecting the same contract and construction Layer as the browser Program. Its second argument contains server host declarations such as `Flags` and `routing`. Its third argument contains request inputs such as `flags` and `url`. Keep init, update, view, lifecycle declarations and handler recipes in the implementation returned by `makeLayer`; the server acquires that graph before running init and view.

::Snippet{name="serverRenderingBlockServerEntry" label="Rendering the root Block and Layer"}

## Move Map Bindings to Their Parent Block

Remove the standalone `makeMapBinding` import from `foldkit/mapBinding`. Call the parent Block's `makeMapBinding` method with the child Block and existing config. The parent Block is no longer a positional argument. The standalone subpath is removed.

For a split feature, destructure and export `makeMapBinding` from its `definition.ts`, then import that factory from the feature module. Its parent contracts remain attached when destructured. Keep the existing Binding registration, key Schema, storage, OutMessage policy, and initialization. See [map Bindings](/core/block#keyed-map-fields) for the current calls.

## Rename Definition Authoring Factories

Block-owned factories now use the same `make*` naming as `makeInit`, `makeUpdate`, and `makeView`. Replace each removed name:

| Previous preview                   | Current API                              |
| ---------------------------------- | ---------------------------------------- |
| `Definition.command(...)`          | `FeatureBlock.makeCommand(...)`          |
| `Definition.mount(...)`            | `FeatureBlock.makeMount(...)`            |
| `Definition.mountStream(...)`      | `FeatureBlock.makeMountStream(...)`      |
| `Definition.resource(...)`         | `FeatureBlock.makeResource(...)`         |
| `Definition.subscriptions(...)`    | `FeatureBlock.makeSubscriptions(...)`    |
| `Definition.managedResources(...)` | `FeatureBlock.makeManagedResources(...)` |
| `Definition.bindChild(...)`        | `FeatureBlock.makeBinding(...)`          |
| `Definition.step(...)`             | `FeatureBlock.makeStep(...)`             |
| `Definition.stepFields(...)`       | `FeatureBlock.makeFieldsStep(...)`       |
| `Definition.stepNoop()`            | `FeatureBlock.makeNoopStep()`            |

Apply the primitive factory renames to an early Namespace used by a generic Block factory as well. `FeatureBlock.makeCommandsStep(...)` retains its name but now requires the [callback argument below](#pass-a-callback-to-makecommandsstep). Keep completion fields such as `subscriptions` and `managedResources`, public Block metadata, and standalone Command and Update APIs unchanged. The removed factory names have no compatibility aliases.

## Rename Step Composition

This change applies to `c701daa80af1`, `396b19976386`, and `bfd880b1e6ca`.

Replace `Update.combine` with `Update.combineSteps` in both data-first and data-last calls. The helper applies pure Steps sequentially to the Model and collects their Commands; it does not sequence Command execution. Its arguments, inferred requirements, and registration checks are unchanged. See [Combining Steps](/core/update#combining-steps).

## Pass a Callback to makeCommandsStep

Existing `FeatureBlock.makeCommandsStep(commands)` calls must become `FeatureBlock.makeCommandsStep(() => commands)`. The collection overload has been removed. For an inline collection, move the array expression inside the callback, as in `FeatureBlock.makeCommandsStep(() => [FocusField()])`.

When Command arguments depend on the Model, read them inside `FeatureBlock.makeCommandsStep(model => commands)`. The callback receives the contextually typed current Model when the Step is applied, including changes from a preceding Step. Construction defers the callback, and application returns the same Model object with its Commands. Neither stage executes Effects; the Runtime executes the Commands.

::Snippet{name="blockCommandsStep" label="Producing Commands from the current Model"}

Converting existing calls is required. Adopting this helper where ordinary update branches already return result objects remains an optional organization change. Keep `makeStep` for additional producer arguments, reusable mixed transitions, and connected or composed results beyond the focused helpers.

## Preserve Update Handler Contracts

Use the exhaustive `Composition.makeUpdate({ Tag: (model, message) => result })` record for local facts. It contextually types the Model and exact Message payload, checks every handler, and retains per-Message Commands and OutMessages for public operations. A selected silent operation can participate in `Update.combineSteps`; an emitting operation cannot lose its OutMessage there. Required dispatch context uses `makeUpdate.withContext(context => handlers)`.

The callback-taking overload is removed. Convert every callback-authored update to an exhaustive handler record; use `makeUpdate({})` for message-free and routed-only Compositions. A handler receives `(model, message)`. Name an extracted single-Message handler `handle<MessageTag>` and pass compatible handlers or Steps directly. Keep callbacks when they adapt payloads, derive inputs, or supply contextual inference. Name application-authored Step values and factories for their operation, such as `clearSearch` and `changeSearchQuery(query)`, without a `make` prefix or `Step` suffix. Framework helpers and types, named OutMessage folds and matchers, and dedicated `handle<MessageTag>` handlers retain their established naming conventions. If one handler mixes connected Binding recipes with raw local result branches, use Block-owned Steps for those local branches. Do not erase connected results through `.model`, a broad return annotation, or a cast.

::Snippet{name="updateCanonicalLocalResults" label="Repairing mixed connected and local results"}

The local no-op in a record can be `CompletedSave: FeatureBlock.makeNoopStep()`. The bare helper is a factory, not that Model-first handler. There is no need to name a no-op alias or wrap every normal handler with `makeStep`. [Update](/core/update) explains the forms and the context-factory adapter.

## Update UI Call Sites

### Render Animation content through `toView`

This change applies to `c701daa80af1`, `396b19976386`, and `bfd880b1e6ca`.

Animation replaced its `content: Html` ViewInput with `toView: () => Html`. The renderer runs at the parent embedding boundary, so event handlers created inside it use the parent dispatcher.

::Snippet{name="previewUpgradeAnimationView" label="Rendering Animation content"}

### Replace the standard Animation leave helper

`Animation.defaultLeaveCommand` has been removed. For standard CSS settlement, name the ordinary Animation Binding before its OutMessage fold and return `AnimationBinding.requestWaitForLeaveSettlement()` from `StartedLeaveAnimating`. Register the policy-selected alias with `AnimationBinding.withOutMessagePolicy({ fold })`. Delete the child Model read and `FoldContext.liftCommand` call that only supported the old helper.

Keep a custom leave Command when settlement also watches another signal, such as trigger movement. Take its generation from `StartedLeaveAnimating`. A custom Command that returns `EndedAnimation` still uses the fold context's `liftCommand`; a parent-owned result Message can call `AnimationBinding.requestFinish(generation)`. See [Animation lifecycle coordination](/ui/animation#why) for both policies.

### Select the Toast Contract and Binding in Tests {#select-the-completed-toast-block-and-binding-in-tests}

This change applies to `c701daa80af1`, `396b19976386`, and `bfd880b1e6ca`.

The module-level `Toast.test` fixture is gone. Call `test.drainEntry` on the exact public Block returned by `Toast.makeBlock`, and pass the exact Binding registered for that Block. A keyed Binding also needs its occurrence key.

::Snippet{name="uiToastDrainEntry" label="Selecting the Toast fixture and Binding"}

The helper handles a freshly shown, non-sticky entry whose first enter and auto-dismiss lifecycle is pending. Use individual Command resolvers after another test step has advanced that lifecycle.

## Vite Security Patches

Update an installed Vite to `8.3.3` or a patched release on its existing supported line, such as `8.2.4` or `8.1.6`. The preview scaffold uses the patched `8.3` line. Refresh the lockfile and confirm that it no longer resolves `launch-editor@2.14.1` or an earlier version.

This vulnerability was already present in the previous preview’s development tooling. The [upstream advisory](https://github.com/advisories/GHSA-587h-7wmj-h5pm) describes the affected Windows editor-launch path and related WSL conditions. Keep existing dependency placement and verify the application's normal development and build commands after updating.

## Native TypeScript Tooling

The target scaffold pins its `typescript` development dependency to native TypeScript `7.1.0-beta`. Existing applications using native TypeScript can adopt the same exact version to use the compiler version checked for this preview. This tooling update is separate from the required factory and Animation API changes.

After installation, confirm that the project's typecheck command and editor language server resolve the intended installed compiler. Restart the language server after changing its package or SDK path. A different global compiler or editor server can produce different performance and diagnostics. Preserve any separate compatibility compiler used by other tools.

The preview reduces repeated compiler work during Block assembly. Large root assemblies can still produce noticeable editor delays; the update does not guarantee a particular response time or memory limit in every editor. Keep the project's normal typecheck and test coverage when changing compiler versions.

### Optional editor setup: tsrs

[tsrs](https://github.com/oxc-project/tsrs/blob/467182f2402b140897e8a02d7a25699db0e79e2a/docs/LSP.md) is an experimental TypeScript language server. In a real Neovim trial, it made `ApplicationBlock` completion usable, though not instantaneous. Testing is limited to that trial and the paired benchmarks recorded in [#1737](https://github.com/foldkit/foldkit/issues/1737); those benchmarks predate the latest optimization and do not establish current-candidate performance.

For this preview, we recommend trying tsrs for editor responsiveness, especially with large Block compositions. Keep the project's official TypeScript dependency, typecheck scripts and CI unchanged.

#### Install and select the server

Install the tested version outside the application, then check the executable's identity:

::Snippet{name="previewTsrsInstall" label="Install the pinned editor server"}

The npm package version identifies the tsrs release; its `--version` output also identifies the TypeScript version it implements, so record both.

For Neovim 0.11 or later, use the installed executable in your LSP configuration. Replace the example path with its absolute installation path. Keep exactly one TypeScript server enabled for the trial buffers by disabling the previous server there.

::Snippet{name="previewTsrsNeovim" label="Select tsrs in Neovim"}

Restart Neovim and open a TypeScript file in the intended project. Run `:checkhealth vim.lsp` and confirm that `foldkit_tsrs_trial` is attached, with the intended executable and project root. Try completion, hover and a diagnostic that appears and clears after an edit. These checks confirm the selected editor server; the project's official typecheck remains the verification gate.

To revert, remove the trial configuration, restore the previous server's enablement and restart Neovim. Confirm the previous client is attached before removing the isolated installation.

See the [official editor setup](https://github.com/oxc-project/tsrs/blob/467182f2402b140897e8a02d7a25699db0e79e2a/docs/LSP.md) for other editors and current limitations.

## Keep Source Model Schemas Independent of Completion

Parents use `ChildBlock.Model` from the independent public contract. Declare `FeatureBlock` once with `Block.make`, export its implementation Layer, and remove preparation producers and four-shape assembly annotations from ordinary application exports.

::Snippet{name="parentSchemaGuardedModel" label="Parent Model through a public contract"}

### Emit Public Block Declarations

Publish the contract, not an inferred descendant graph. Generic library interfaces can name their refined contract. Export any required nominal key type through its owning subpath. Check actual declaration output and a source-free relocated consumer; compilation in the repository does not establish that a package can be consumed externally.

::Snippet{name="blockDeclarationBoundary" label="Portable public Block contract"}

## Confirm the Remaining Compiler Findings

The checklist below applies to the older `c701daa80af1`, `396b19976386`, and `bfd880b1e6ca` snapshots. For `1fbeaffe6563`, use [its direct upgrade path](#upgrade-from-1fbeaffe6563), then [verify the upgrade](#verify-the-upgrade). Search first, then change only the code the project contains:

- Replace previous completion methods and preparation producers with the [declared contract and effectful constructor](#adopt-layer-based-block-construction).
- Replace every removed Definition or Namespace factory name using the table above. Do not rename completion config fields, public Block metadata, or standalone Command and Update APIs.
- Convert each existing `makeCommandsStep(commands)` call to a callback. Construct Model-dependent Commands inside that callback so they read the Model at Step application time.
- Replace remaining `makeApplicationDefinition`, `assembleApplication`, and `assembleElement` uses with the root Block/Layer pair and Program boundary above.
- Update each server render whose first argument is an Application Composition or whose host config repeats `init`, `update`, or `view`.
- Replace Animation `viewInputs.content` with a top-level `toView` renderer.
- Replace `Animation.defaultLeaveCommand` and its Model read or `liftCommand` wiring with the bound `requestWaitForLeaveSettlement()` operation. Preserve custom leave Commands that also watch movement or another completion signal.
- Replace module-level `Toast.test` calls with the selected Toast contract's fixture and exact Binding.
- Move every child OutMessage policy out of the previous preview's `bindChild` config, rename that factory to `makeBinding`, and select the policy with `.withOutMessagePolicy({ fold?, forward? })`. Build every callable fold with `ParentBlock.makeOutMessageFold(ChildBlock, handlers)`, including inline folds. The forwarding API is unchanged. Export and register the policy-complete `<Child>Binding`. Keep an unconfigured base internal when self-referential or reciprocal helpers need it to break a dependency cycle. No raw child matcher or return annotation is needed.
- Run typechecking against every `makeInit` plan and connected Binding Step. An ordinary Step must return an update result. Preserve a deferred connected operation through the owning Block's `makeStep`, and execute it only inside the Composition that registered its Binding. The stronger checks also retain Command requirements from combined initialization Steps.
- Keep callbacks at the top level of `viewInputs`. A callback nested in a record, array, tuple, union, or `Option` is rejected because its dispatch boundary is ambiguous. Return callback-bearing Html from a top-level renderer such as `toView` instead.

## Verify the Upgrade

Run the project's formatter, typecheck, lint, tests, and build after these edits. Treat each reported site as evidence. Do not mechanically rewrite every Binding or OutMessage policy. Include test files in typechecking and exercise the browser, SSR/SSG, or embedding path the application uses. Confirm that the lockfile resolves one exact Foldkit snapshot.

## Optional Convenience

### Use focused Step producers

`makeFieldsStep`, `makeCommandsStep`, and `makeOutMessageStep` all take producer callbacks. Ordinary producers receive the current Model and, for Message-dependent handlers, the exact Message. Use `.fromMessage` for payload-only producers and `() => value` for fixed producers. Pass compatible Steps and handlers directly in the exhaustive update record:

::Snippet{name="blockMessageStepProducers" label="Producing focused handler results"}

Producers run when applied. Commands-only and OutMessage-only helpers preserve the incoming Model identity, and the Runtime executes returned Commands later. The OutMessage helper's previous value form is removed; a fixed OutMessage now uses a zero-argument producer:

::Snippet{name="blockOutMessageStep" label="Producing a fixed OutMessage"}

Converting existing value/collection arguments is required. Adopting focused helpers in other single-purpose handlers is optional for downstream upgrades. Keep cohesive mixed transitions as direct results and reusable mixed or connected operations on `makeStep`. `Update.withOutMessage` attaches an OutMessage to an existing plain result or accepts an optional value. `Update.combineSteps` still rejects emitting Steps.

### Simplify keyed storage

An exact required `Schema.Option` field containing one keyed Struct wrapper can use the `field`, `key`, and `childField` Binding shorthand. `None` means absent, and `Binding.init` remains responsible for creating an occurrence. Existing explicit `readAll`, `read`, `writeAt`, and `keySchema` policies remain supported. See [Optional keyed children](/core/block#fold-child-at) before choosing the shorthand.

## Refresh Agent Context

If the project already vendors Foldkit at `repos/foldkit`, pin it to the full `sourceCommit` from `preview-release.json`, not to `main` and not to a guessed release tag. Refresh any copied Foldkit skills from that subtree; existing symlinked skill directories follow the new subtree automatically. If the project maintains the managed `FOLDKIT.md` snapshot, replace it with `repos/foldkit/packages/create-foldkit-app/templates/base/FOLDKIT.md`.

A project without those assets can use this deployment's documentation and commit-pinned source links directly; adding vendored source or skills is optional. Preserve the project's `AGENTS.md` and any other project-owned instructions. `FOLDKIT.md` is the replaceable framework snapshot; `AGENTS.md` belongs to the project.

When asking a coding agent to perform the migration, give it this page URL and the same-origin `/preview-release.json` URL. That supplies both the migration path and the verified target manifest without relying on remembered API names.

## Troubleshooting

- **An incomplete update reports a connected result with no `model`.** Check that every local Message tag has a handler before following the structural expansion. A missing Command completion can cause this cascade. The [Update troubleshooting guide](/core/update#checking-missing-handlers-before-structural-errors) explains the check without weakening result contracts.
- **One handler mixes `{ model }` with a connected Binding recipe.** The diagnostic points at the handler and recommends `FeatureBlock.makeStep` or a focused Step helper for its local branch; ordinary raw-only handlers need no wrapper. See the [paired branch repair](/core/update#preserving-local-results-beside-connected-operations).
- **An extracted Step cannot apply `combineSteps` to its Model.** Return the deferred `combineSteps(steps)` from the Block-owned producer. The registered Composition applies it later; its own contextual handlers may use `combineSteps(model, steps)`. See [connected combinations](/core/update#child-bindings-and-multiple-steps).
- **The Program rejects `ApplicationBlock`.** Make sure the root has no OutMessage for a host to discard. Author its view through the same Composition used by its init and update builders; `Program.make` requires a `Document` view and `Program.makeElement` requires an Html view.
- **Server init arguments do not match.** The presence of `Flags` and `routing` determines whether root init receives Flags, a URL, both, or neither. Keep request values in the third `renderToString` argument.
- **A connected Step has no readable `model` or `commands`.** Return or compose the opaque result inside the registered Composition. Do not execute a Binding operation against a raw parent Model outside that graph.
- **A ViewInput reports a nested callback.** Move the callback to a top-level ViewInput renderer. Keep the data it consumes in sibling fields or close over parent view values.
- **`ToastBlock.test.drainEntry` finds no timer.** Check the completed Toast Block, exact Binding, occurrence key, entry ID, and timer version. Use individual resolvers when the entry is sticky or its lifecycle has advanced.
- **Installed packages show different canary hashes.** Reapply the exact manifest versions and regenerate the lockfile before diagnosing TypeScript errors.
- **pnpm refuses a newly uploaded package because of its age.** Add that exact manifest entry to `minimumReleaseAgeExclude`. Keep the project's minimum release age enabled.

## DragAndDrop parent coordination

DragAndDrop now exposes `StartedKeyboardDrag` and `ChangedKeyboardTarget`. Add both cases to exhaustive OutMessage policies, using the parent's `makeNoopStep` when no reaction is needed. The target notification carries the item ID and previous/next container IDs and indices, and only emits for a changed keyboard target. Keyboard move results must preserve the invocation's `keyboardDragGeneration`; results from cancelled interactions cannot affect a restarted drag.

Move announcements derived from a Binding writer into its OutMessage policy. Writers place child state into storage; policies own parent reactions. The recommended `no-binding-write-coordination` rule detects straightforward direct-field violations. An optimistic move announcement should follow the parent's accepted placement; persistence failure should announce rollback separately.
