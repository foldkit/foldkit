# Upgrade a Previous Preview

## Overview

This guide covers upgrades from the Block previews listed below to the candidate represented by this website deployment. Identify the installed snapshot before choosing its migration path.

| Installed canary source suffix                    | Upgrade path                                                                                                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1f6776fa7ece`                                    | [Upgrade from 1f6776fa7ece](#upgrade-from-1f6776fa7ece). The preparation, assembly, and Program APIs already match.                                                                 |
| `1fbeaffe6563`                                    | [Upgrade from 1fbeaffe6563](#upgrade-from-1fbeaffe6563).                                                                                                                            |
| `c701daa80af1`, `396b19976386`, or `bfd880b1e6ca` | Follow the complete guide, including the application boundary, Step composition, and UI call-site changes. These three snapshots share the same application API for this migration. |

The older-preview baseline was checked at Coverchart checkpoint `084f1c94f38137837e9609c63ef08176ad607c9a`, with `foldkit@0.168.0-canary.bfd880b1e6ca` and its installed Foldkit packages aligned to that snapshot.

The candidate is not available merely because this page exists. An uploaded integration preview identifies itself in the page banner and in the same-origin [`preview-release.json`](/preview-release.json). Use the exact source commit and package versions from that manifest. Do not guess a version, npm tag, or package URL.

If the project uses a stable release or an earlier preview architecture, start with [Migrate to the Preview](/preview-migration). The current [Block](/core/block), [Runtime](/core/runtime), and [server rendering](/core/server-rendering) guides describe the target architecture in full.

## Select the Installed Source and Target

### Identify the installed preview

Read both `package.json` and the package manager lockfile. `package.json` records the requested Foldkit packages; the lockfile records the versions the project actually resolves. A canary version ends in `-canary.<source-hash>`.

Compare the source hash suffix across `foldkit`, `@foldkit/ui`, and every other Foldkit package the project declares. Their numeric version prefixes can differ because each package has its own version line. The source hash must agree. A project with different source hashes has a mixed snapshot and should be aligned before code migration.

### Install one coherent target

On an uploaded integration preview, the banner identifies the verified release and links to its exact package versions. The manifest's `packages` object is the authority for the exact version of every package in the snapshot. Update every Foldkit dependency the project declares to the corresponding exact version, update the lockfile with the project's package manager, and confirm that the resolved canary suffixes all name the manifest's `sourceCommit`.

Do not combine candidate packages with packages from the previous preview. Internal package dependencies are tested as one commit-addressed set.

If the project enforces pnpm's `minimumReleaseAge`, a newly uploaded preview may be too recent to install. Preserve that policy and add only the exact `name@version` entries from the verified manifest to `minimumReleaseAgeExclude`. Do not disable the age check globally.

## Upgrade from 1f6776fa7ece

The source snapshot is `1f6776fa7ececa766188df5201eefec6ba781b5d`. It already uses `Composition.prepareBlock`, checked `Block.assemble(prepare)` exports, the `make*` Definition factories, and `Program.make` or `Program.makeElement`. Keep those names and the existing child graph. Coverchart's starting installation uses `foldkit@0.169.0-canary.1f6776fa7ece`; identify your own starting packages from the lockfile.

After installing one coherent target:

1. Replace every collection argument to `Definition.makeCommandsStep` with the [callback form](#pass-a-callback-to-makecommandsstep). The collection overload is removed.
2. Convert callback-authored updates to exhaustive [handler records](#preserve-update-handler-contracts). Use `makeUpdate({})` without local Messages and `makeUpdate.withContext` for dispatch context. The callback overload is removed.
3. Preserve connected result channels. A single handler mixing connected Binding recipes with raw local results must use Definition-owned Steps for those local branches. Keep the complete result of an OutMessage-producing operation instead of composing it where that OutMessage would be discarded.
4. Replace value-taking `Definition.makeOutMessageStep` calls with a [producer callback](#use-focused-step-producers). The value overload is removed. The field, Command, and OutMessage helpers now share Model-aware, Message-aware, and `.fromMessage` forms.
5. Rename any ManagedResource registry entry key named `layer`; that key now holds the aggregate handler Layer. A fully attached owned registry exposes [managedResources.layer](/core/managed-resources); mixed or host-owned registries use explicit entry providers.
6. If the application uses DragAndDrop, add `StartedKeyboardDrag` and `ChangedKeyboardTarget` to exhaustive OutMessage policies. These report keyboard pickup and the proposed target; handle them in parent policy or use the owning Definition's no-op fold handler when no reaction is needed. Custom keyboard-move handlers and manually constructed `CompletedResolveKeyboardMove` Messages must echo the invocation's `keyboardDragGeneration`. The public Story helper derives that generation from the selected pending Command. The [DragAndDrop guide](/ui/drag-and-drop) shows the current contract.
7. Check keyed Command cancellation policies. `toKey` now receives only the own fields selected by `keyFields` on both invocation and interruption. It cannot read unrelated invocation args. Preserve precise selected fields in extracted `Command.InterruptOption<Args, Key>` annotations; broad policies must handle uncertain fields as optional. Narrow policy unions before construction. See [keyed interruption](/core/commands#choosing-an-interruption-key).
8. Run [the upgrade checks](#verify-the-upgrade), including tests and public declaration output where applicable.

Effect `DateTime` and `TimeZone` values can now pass through ViewInputs without converting them to primitives. Added nested application callbacks remain rejected. `Update.withOutMessage` also retains its OutMessage after homogeneous or nested connected Step combinations. These declaration fixes require no new API names or data conversions.

`Story.message` now permits another fact while Commands are pending. Pending Commands retain their identity and still require explicit resolution before the Story ends. This lets concurrency tests keep the actual pending work instead of constructing a pending Model. Scene retains its separate interaction and Mount checks. See [concurrent Story delivery](/testing/story#multi-step-flows).

Reciprocal Binding policies now resolve converging paths without repeatedly expanding the same policy graph. The reported twelve-Binding compiler-depth case has regression coverage. This does not establish an unlimited graph size or eliminate all editor latency.

The following additions are optional:

- Schema-backed Record and HashMap child fields can use [`makeMapBinding` from `foldkit/mapBinding`](/core/block#keyed-map-fields), removing repeated lookup and replacement configuration. Existing general keyed Bindings remain supported for custom relationships.
- A closed, fully attached ManagedResource registry supplies its handler recipes through [managedResources.layer](/core/managed-resources), matching Subscriptions. Empty registries supply `Layer.empty`; mixed attached/host-owned registries require explicit provider selection.
- Story and Scene helpers can inspect captured Command arguments through [Command.argsOf](/testing/story#inspect-captured-command-arguments), matching the original Definition's source identity without changing the pending Command or selecting an occurrence.
- Parent Stories can wrap a child fact with [toParentMessage from foldkit/test](/testing#send-a-child-fact-without-a-view), using the exact Binding without view setup or fabricated envelope fields. Existing Command and Subscription replay paths remain appropriate for their respective sources.
- Whole tagged child variants can use [makeVariantBinding](/core/block#whole-tagged-variants). [Dynamic storage helpers](/core/init-and-flags#dynamic-storage-helpers) set singular children, append initialized keyed arrays, and insert direct-value map entries without repeating storage writers.
- Story can [derive a Message from the current Model](/testing/story#build-a-message-from-the-current-model) with `messageWith` or [deliver a decoded registered Subscription Message](/testing/story#deliver-a-subscription-message) with `Subscription.from(FeatureBlock.subscriptions).emit`.
- Scene can [keep one exact ordinary Command pending](/testing/scene#pending-command-rules) across another interaction with `Command.keepPending`. The Command remains visible to assertions and resolution, and must resolve before the Scene ends.

The new Workspace example demonstrates a larger application, and named public UI Block headers improve declaration serialization. Those changes do not require a new application architecture. Applications with public declaration output should still [verify their own emission](#emit-public-block-declarations); a successful application source check alone does not establish declaration portability.

## Upgrade from 1fbeaffe6563

The verified source is `1fbeaffe656303b44d8fd20c18d598f08014a5c9`. Its root already uses the previous `assembleBlock` preparation method and `Program.make` or `Program.makeElement`. Rename that method to `prepareBlock`, name its private zero-argument producer `prepare`, and assemble the returned draft with `Block.assemble(prepare)` while keeping the existing graph and host wiring:

- Child policies use `withOutMessagePolicy`.
- Animation content uses `toView`.
- Toast tests use the completed Block's helper.
- Step composition uses `Update.combineSteps`.

After installing one coherent target, make the changes used by your application:

1. Replace `assembleBlock` with `prepareBlock`, replace `Block.complete` with `Block.assemble`, and rename each ordinary private `assemble` producer to `prepare`. For direct `foldkit/block` imports, rename the `complete` function to `assemble` and the `AssembleBlock` method type to `PrepareBlock`. The four `FromAssembly*` annotation types retain their names. The old names have no compatibility aliases.
2. Apply the [Definition and Namespace factory renames](#rename-definition-authoring-factories). The old names have no compatibility aliases.
3. Convert existing `makeCommandsStep` collection arguments to the [required callback form](#pass-a-callback-to-makecommandsstep).
4. Replace `Animation.defaultLeaveCommand` with the [bound leave-settlement operation](#replace-the-standard-animation-leave-helper) wherever the application uses standard CSS settlement. Keep custom settlement Commands for additional signals.
5. Update any affected [UI trigger and focus tests](#update-ui-trigger-and-focus-tests).
6. Apply the [Vite security patches](#vite-security-patches) to affected installed development tooling.
7. Check [update handler contracts](#preserve-update-handler-contracts) and [public declaration boundaries](#emit-public-block-declarations) for the code the project contains.
8. Run [the upgrade checks](#verify-the-upgrade). Assembly now rejects incompatible same-named Command handler contracts inside generic Block factories. Correct the owning definitions or handler Layers when this exposes invalid wiring.

The checked preparation and assembly boundary below is required for every source Block. Existing `makeCommandsStep` callers must also adopt its callback argument. [Native TypeScript tooling](#native-typescript-tooling) and choosing [Command-only Step helpers](#optional-convenience) remain separate setup or organization choices. The explicit producer/header shape also keeps parent Model Schema access independent of the completed implementation graph.

### Update UI trigger and focus tests

Popover, Menu, and Listbox report trigger clicks as `ClickedButton`. Include that fact in exhaustive component Message matchers and update Scene expectations that previously expected an open or close Message from a trigger click. The component's update decides whether to open or close from its current Model. Parent coordination uses Binding operations and OutMessage policies.

For a Popover with the default focus policy, use `Scene.focusLeave(panel)` instead of `Scene.blur(panel)` when testing dismissal as focus leaves the panel. Moving focus between the panel and its descendants keeps it open. With `contentFocus: true`, the application owns focus and dismissal.

Optional `makeVariantBinding` from `foldkit/variantBinding` replaces manual accessors when a child occupies one complete tagged member of the parent `Schema.Union`. Include the actual child Model Schema in that union. Parent update still owns variant switches and explicit initialization. See [whole tagged variants](/core/block#whole-tagged-variants).

The optional `foldkit/bindingInit` module adds `initAndSet` for required/optional direct fields and exact key/child Option wrappers, `initAndAppend` for arrays with an existing `init.instances`/`init.toItem` policy, and `initAndInsert` for direct-value Record/HashMap storage. Pass the Binding, current parent Model and `{ args }`, adding `key` for keyed storage. Append and insert reject occupied keys. Keep explicit initialization for additional wrapper metadata, sibling changes, parent Commands, or whole tagged variants. See [dynamic storage helpers](/core/init-and-flags#dynamic-storage-helpers).

## Update the Application Boundary

This section applies to `c701daa80af1`, `396b19976386`, and `bfd880b1e6ca`.

### Complete an ordinary root Block

The root now follows the same Definition, Composition, preparation, and assembly stages as every feature. Replace `makeApplicationDefinition` with `Block.makeDefinition('Application', ...)`. Return the authored init, update, view, lifecycle declarations, and local `EffectsLayer` from an `ApplicationComposition.prepareBlock(...)` producer named `prepare`, then finish `ApplicationBlock` with `Block.assemble(prepare)`.

The old `ApplicationComposition.assembleApplication` and `ApplicationComposition.assembleElement` methods have been removed. Browser host fields do not belong in `prepareBlock`.

::Snippet{name="counterApplicationWithFlags" label="Completing the root Block"}

### Create the browser Program

Create the browser host in `entry.ts`. Use `Program.make` for a page-owning application or `Program.makeElement` for an application scoped to its container. Pass `ApplicationBlock`, the container, Flags, routing, DevTools, and other browser host options there. Supply ordinary Services with `program.provide(ApplicationLayer)` before starting the Runtime.

::Snippet{name="applicationEntryPoint" label="Starting the browser Program"}

Replace `devTools: { Message: ApplicationBlock.Message }` with `devTools: { dispatch: true }` when an external MCP client should discover and dispatch Messages. Program derives the dispatch Codec from the completed root Block, including generated child envelopes. Omitting `devTools` keeps development inspection enabled with external dispatch disabled. `devTools: false` disables the DevTools store, overlay, and browser bridge.

Remove annotations and imports that use the old loose root types from `Runtime`:

- `ApplicationConfig` and `ApplicationConfigWithFlags`
- `RoutingApplicationConfig` and `RoutingApplicationConfigWithFlags`
- `ElementConfig` and `ElementConfigWithFlags`
- `ApplicationInit`, `RoutingApplicationInit`, and `ElementInit`
- `MakeRuntimeReturn`

Root behavior types now come from the completed Block and its Composition. Use `Program.Program`, `Program.Element`, or `Program.Runnable` when a public signature needs to describe a browser host value. Server rendering has separate host configuration types and keeps them.

Application Schema aliases remain legal, but current application code uses direct type queries. Inside a feature, annotate an uncommon explicit boundary with `typeof Model.Type`, `typeof Message.Type`, or `typeof OutMessage.Type`. Outside a child, query `typeof ChildBlock.Model.Type`, `typeof ChildBlock.Message.Type`, or `typeof ChildBlock.OutMessage.Type`. Let Definition and Composition callbacks infer their owned parameters. Keep purposeful public, generic, mapped, and conditional aliases such as an owner-specific `Block.ViewBuilderFor` type.

Canonical routing Messages can be passed directly when their payloads are `{ request }` and `{ url }`. Keep a callback when the application maps either value into a different payload.

### Pass the completed Block to the server

`Server.renderToString` now receives the same `ApplicationBlock` as the browser Program. Its second argument contains server host declarations such as `Flags` and `routing`. Its third argument contains request inputs such as `flags` and `url`. Remove `init`, `update`, `view`, lifecycle declarations, and handler recipes from the server call because the completed Block already carries them.

::Snippet{name="serverRenderingBlockServerEntry" label="Rendering the completed root Block"}

## Rename Definition Authoring Factories

Definition-owned factories now use the same `make*` naming as `makeInit`, `makeUpdate`, and `makeView`. Replace each removed name:

| Previous preview                   | Current API                            |
| ---------------------------------- | -------------------------------------- |
| `Definition.command(...)`          | `Definition.makeCommand(...)`          |
| `Definition.mount(...)`            | `Definition.makeMount(...)`            |
| `Definition.mountStream(...)`      | `Definition.makeMountStream(...)`      |
| `Definition.resource(...)`         | `Definition.makeResource(...)`         |
| `Definition.subscriptions(...)`    | `Definition.makeSubscriptions(...)`    |
| `Definition.managedResources(...)` | `Definition.makeManagedResources(...)` |
| `Definition.bindChild(...)`        | `Definition.makeBinding(...)`          |
| `Definition.step(...)`             | `Definition.makeStep(...)`             |
| `Definition.stepFields(...)`       | `Definition.makeFieldsStep(...)`       |
| `Definition.stepNoop()`            | `Definition.makeNoopStep()`            |

Apply the primitive factory renames to an early Namespace used by a generic Block factory as well. `Definition.makeCommandsStep(...)` retains its name but now requires the [callback argument below](#pass-a-callback-to-makecommandsstep). Keep completion fields such as `subscriptions` and `managedResources`, completed Block metadata, and standalone Command and Update APIs unchanged. The removed factory names have no compatibility aliases.

## Rename Step Composition

This change applies to `c701daa80af1`, `396b19976386`, and `bfd880b1e6ca`.

Replace `Update.combine` with `Update.combineSteps` in both data-first and data-last calls. The helper applies pure Steps sequentially to the Model and collects their Commands; it does not sequence Command execution. Its arguments, inferred requirements, and registration checks are unchanged. See [Combining Steps](/core/update#combining-steps).

## Pass a Callback to makeCommandsStep

Existing `Definition.makeCommandsStep(commands)` calls must become `Definition.makeCommandsStep(() => commands)`. The collection overload has been removed. For an inline collection, move the array expression inside the callback, as in `Definition.makeCommandsStep(() => [FocusField()])`.

When Command arguments depend on the Model, read them inside `Definition.makeCommandsStep(model => commands)`. The callback receives the contextually typed current Model when the Step is applied, including changes from a preceding Step. Construction defers the callback, and application returns the same Model object with its Commands. Neither stage executes Effects; the Runtime executes the Commands.

::Snippet{name="blockCommandsStep" label="Producing Commands from the current Model"}

Converting existing calls is required. Adopting this helper where ordinary update branches already return result objects remains an optional organization change. Keep `makeStep` for additional producer arguments, reusable mixed transitions, and connected or composed results beyond the focused helpers.

## Preserve Update Handler Contracts

Use the exhaustive `Composition.makeUpdate({ Tag: (model, message) => result })` record for local facts. It contextually types the Model and exact Message payload, checks every handler, and retains per-Message Commands and OutMessages for public operations. A selected silent operation can participate in `Update.combineSteps`; an emitting operation cannot lose its OutMessage there. Required dispatch context uses `makeUpdate.withContext(context => handlers)`.

The callback-taking overload is removed. Convert every callback-authored update to an exhaustive handler record; use `makeUpdate({})` for message-free and routed-only Compositions. A handler receives `(model, message)`. Name an extracted single-Message handler `handle<MessageTag>` and pass compatible handlers or Steps directly. Keep callbacks when they adapt payloads, derive inputs, or supply contextual inference. Give every named Model-first Step value a descriptive name ending in `Step`. Give a purposeful transition factory that returns a Step an operation name ending in `Step` too. Named OutMessage folds and matchers retain their established names. If one handler mixes connected Binding recipes with raw local result branches, use Definition-owned Steps for those local branches. Do not erase connected results through `.model`, a broad return annotation, or a cast.

::Snippet{name="updateCanonicalLocalResults" label="Repairing mixed connected and local results"}

The local no-op in a record can be `CompletedSave: Definition.makeNoopStep()`. The bare helper is a factory, not that Model-first handler. There is no need to name a no-op alias or wrap every normal handler with `makeStep`. [Update](/core/update) explains the forms and the context-factory adapter.

## Update UI Call Sites

### Render Animation content through `toView`

This change applies to `c701daa80af1`, `396b19976386`, and `bfd880b1e6ca`.

Animation replaced its `content: Html` ViewInput with `toView: () => Html`. The renderer runs at the parent embedding boundary, so event handlers created inside it use the parent dispatcher.

::Snippet{name="previewUpgradeAnimationView" label="Rendering Animation content"}

### Replace the standard Animation leave helper

`Animation.defaultLeaveCommand` has been removed. For standard CSS settlement, name the ordinary Animation Binding before its OutMessage fold and return `AnimationBinding.requestWaitForLeaveSettlement()` from `StartedLeaveAnimating`. Register the policy-selected alias with `AnimationBinding.withOutMessagePolicy({ fold })`. Delete the child Model read and `FoldContext.liftCommand` call that only supported the old helper.

Keep a custom leave Command when settlement also watches another signal, such as trigger movement. Take its generation from `StartedLeaveAnimating`. A custom Command that returns `EndedAnimation` still uses the fold context's `liftCommand`; a parent-owned result Message can call `AnimationBinding.requestFinish(generation)`. See [Animation lifecycle coordination](/ui/animation#why) for both policies.

### Select the completed Toast Block and Binding in tests

This change applies to `c701daa80af1`, `396b19976386`, and `bfd880b1e6ca`.

The module-level `Toast.test` fixture is gone. Call `test.drainEntry` on the exact completed Block returned by `Toast.make`, and pass the exact Binding registered for that Block. A keyed Binding also needs its occurrence key.

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

Give an ordinary completed Block an explicit producer/header boundary. Move its existing `prepareBlock` call into one private zero-argument function named `prepare`, then place the `SettingsBlock` export immediately after it with no blank line. Apply the matching `Block.FromAssemblyWith*` annotation and initialize the export with `Block.assemble(prepare)`. A direct `prepare()` call returns only the opaque draft and has no Model or Block methods. Use a descriptive producer name only when one file genuinely contains multiple preparation producers. Keep the payload, local effects and graph unchanged.

::Snippet{name="blockFeatureExports" label="An explicit completed Block boundary"}

Choose the helper from the Definition's declared OutMessage and prepared view:

| Assembled view | Declared OutMessage | Export annotation                           |
| -------------- | ------------------- | ------------------------------------------- |
| Yes            | No                  | `Block.FromAssemblyWithView`                |
| Yes            | Yes                 | `Block.FromAssemblyWithViewAndOutMessage`   |
| No             | Yes                 | `Block.FromAssemblyWithOutMessage`          |
| No             | No                  | `Block.FromAssemblyWithoutViewOrOutMessage` |

Each helper takes `typeof Model` and `typeof prepare`. The four names keep the view and OutMessage shapes explicit; there is no unified `FromAssembly` helper. The longer annotation gives TypeScript a direct Model member without making a parent infer the whole source implementation merely to read its Schema. The producer infers the opaque draft, and the helper checks its exact completed contract and Model Schema through `Block.assemble`. Do not replace this with a cast, a broad Block annotation, `satisfies`, a raw producer call, or an annotation without the matching assembly call.

The feature barrel exports its completed Block. Keep the Model Schema internal to the feature and compose parent state with `SettingsBlock.Model`. An application that adopted a separate canonical Model reexport for compiler performance can remove that reexport after adding the checked header and updating its parent imports. Preserve independently public domain Schemas and generic component contracts.

The recommended `foldkit/no-completed-block-model-in-schema` rule still reports proven inferred completed Models inside Schema construction, including nested wrappers. It accepts the recognized checked producer/header boundary. Ordinary public Model access and type queries remain supported. See [Model Schema dependencies](/patterns/project-organization#keep-model-schema-dependencies-small) for recognition limits. This is a compiler-work boundary, not a promise of instant editor responses.

### Emit Public Block Declarations

Packages that ship declaration files should name their public completed Block contracts with a same-name interface and value over the existing matching `FromAssembly*` header. JavaScript-only applications keep the checked value annotation above. The private preparation producer and `Block.assemble` call stay unchanged:

::Snippet{name="blockDeclarationBoundary" label="Keeping a public Block declaration named"}

Run declaration emission for the actual public entrypoints and check the emitted package externally. There is no reliable graph-size threshold, and `noEmit` alone does not verify serialization. This boundary avoids repeated child expansion; it does not guarantee that every larger root producer will fit the compiler's serialization limit. See [declaration emission](/patterns/project-organization#declaration-emission).

## Confirm the Remaining Compiler Findings

The checklist below applies to the older `c701daa80af1`, `396b19976386`, and `bfd880b1e6ca` snapshots. For `1fbeaffe6563`, use [its direct upgrade path](#upgrade-from-1fbeaffe6563), then [verify the upgrade](#verify-the-upgrade). Search first, then change only the code the project contains:

- Replace `assembleBlock` with `prepareBlock`, replace `Block.complete` with `Block.assemble`, and rename an ordinary private `assemble` producer to `prepare`.
- Replace every removed Definition or Namespace factory name using the table above. Do not rename completion config fields, completed Block metadata, or standalone Command and Update APIs.
- Convert each existing `makeCommandsStep(commands)` call to a callback. Construct Model-dependent Commands inside that callback so they read the Model at Step application time.
- Replace remaining `makeApplicationDefinition`, `assembleApplication`, and `assembleElement` uses with the completed root Block and Program boundary above.
- Update each server render whose first argument is an Application Composition or whose host config repeats `init`, `update`, or `view`.
- Replace Animation `viewInputs.content` with a top-level `toView` renderer.
- Replace `Animation.defaultLeaveCommand` and its Model read or `liftCommand` wiring with the bound `requestWaitForLeaveSettlement()` operation. Preserve custom leave Commands that also watch movement or another completion signal.
- Replace module-level `Toast.test` calls with the completed Toast Block's fixture and exact Binding.
- Move every child OutMessage policy out of the previous preview's `bindChild` config, rename that factory to `makeBinding`, and select the policy with `.withOutMessagePolicy({ fold?, forward? })`. Build every callable fold with `ParentDefinition.makeOutMessageFold(ChildBlock, handlers)`, including inline folds. The forwarding API is unchanged. For self-referential or reciprocal policy, name the ordinary Bindings first, author the helpers against those values, then select and register `<Child>BindingWithOutMessagePolicy`. No raw child matcher or return annotation is needed.
- Run typechecking against every `makeInit` plan and connected Binding Step. An ordinary Step must return an update result. Preserve a deferred connected operation through the owning Definition's `makeStep`, and execute it only inside the Composition that registered its Binding. The stronger checks also retain Command requirements from combined initialization Steps.
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

- **The Program rejects `ApplicationBlock`.** Make sure the root has no OutMessage for a host to discard. Author its view through the same Composition used by `prepareBlock`; `Program.make` requires a `Document` view and `Program.makeElement` requires an Html view.
- **Server init arguments do not match.** The presence of `Flags` and `routing` determines whether root init receives Flags, a URL, both, or neither. Keep request values in the third `renderToString` argument.
- **A connected Step has no readable `model` or `commands`.** Return or compose the opaque result inside the registered Composition. Do not execute a Binding operation against a raw parent Model outside that graph.
- **A ViewInput reports a nested callback.** Move the callback to a top-level ViewInput renderer. Keep the data it consumes in sibling fields or close over parent view values.
- **`ToastBlock.test.drainEntry` finds no timer.** Check the completed Toast Block, exact Binding, occurrence key, entry ID, and timer version. Use individual resolvers when the entry is sticky or its lifecycle has advanced.
- **Installed packages show different canary hashes.** Reapply the exact manifest versions and regenerate the lockfile before diagnosing TypeScript errors.
- **pnpm refuses a newly uploaded package because of its age.** Add that exact manifest entry to `minimumReleaseAgeExclude`. Keep the project's minimum release age enabled.

## DragAndDrop parent coordination

DragAndDrop now exposes `StartedKeyboardDrag` and `ChangedKeyboardTarget`. Add both cases to exhaustive OutMessage policies, using the parent's `makeNoopStep` when no reaction is needed. The target notification carries the item ID and previous/next container IDs and indices, and only emits for a changed keyboard target. Keyboard move results must preserve the invocation's `keyboardDragGeneration`; results from cancelled interactions cannot affect a restarted drag.

Move announcements derived from a Binding writer into its OutMessage policy. Writers place child state into storage; policies own parent reactions. The recommended `no-binding-write-coordination` rule detects straightforward direct-field violations. An optimistic move announcement should follow the parent's accepted placement; persistence failure should announce rollback separately.
