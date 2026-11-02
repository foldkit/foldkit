# Upgrade a Previous Preview

## Overview

This guide upgrades an application from an earlier Blocks preview to the class Blocks in this deployment. It covers two earlier previews:

- The Definitions preview, built on `Block.makeDefinition`, Compositions, Bindings, and `Block.assemble`. Most of this page covers it.
- The class Blocks preview that implemented a Block with `X.make(Effect.fn(function* (id, args) { ... }))`, a constructor that ran once per instance. [Upgrade from Per-Instance Constructors](#per-instance-constructors) covers it.

If the project uses a stable release, start with [Migrate from Stable Foldkit](/preview-migration) instead.

The Definitions preview split each feature into stages: a Definition owned the contracts and effect handlers, a Composition owned the child graph and authored init, update, and view, and assembly produced the completed `FeatureBlock`. A parent reached each child through a Binding. In this preview, a Block is one class plus one Layer:

- The class declares the contract: Model, Message, OutMessage, and the Commands and Mounts the Block owns.
- `Feature.toLayer(...)` implements it and returns a Layer, `FeatureLive`. It takes `() => ({ ... })` when the Block uses no services, or `Effect.gen(function* () { ... })` when its handlers do. Either runs once. The Effect form yields the services the Block uses, and returns the Block's module: `init`, update handlers, effect handlers, Subscriptions, and view. Every instance shares that module.
- A child instance is plain data. The parent creates it with `new Child(id, args)` and holds it in its Model. The instance replaces the Binding: the parent sends it Messages, handles its OutMessages with `Child.on`, and renders it with `.view()`.

The architecture is the same. Messages record facts, update is pure, and the Runtime performs the Commands update returns. Most changes are mechanical once you see where each old piece goes.

## Select the Installed Source and Target

### Identify the installed preview

Read both `package.json` and the package manager lockfile. `package.json` records the requested Foldkit packages; the lockfile records the versions the project actually resolves. A canary version ends in `-canary.<source-hash>`.

Compare the source hash suffix across `foldkit`, `@foldkit/ui`, and every other Foldkit package the project declares. Their numeric version prefixes can differ because each package has its own version line. The source hash must agree. A project with different source hashes has a mixed snapshot and should be aligned before code migration.

Every earlier Blocks preview, whatever its hash, follows the path on this page. A preview that still used `assembleBlock`, `Block.complete`, or `makeApplicationDefinition` follows it too; those names map to the same rows below as `prepareBlock`, `Block.assemble`, and `Block.makeDefinition`.

### Install one coherent target

An uploaded integration preview identifies itself in the page banner and in the same-origin [`preview-release.json`](/preview-release.json). The manifest's `packages` object is the authority for the exact version of every package in the snapshot. Update every Foldkit dependency the project declares to the corresponding exact version, update the lockfile with the project's package manager, and confirm that the resolved canary suffixes all name the manifest's `sourceCommit`. Do not guess a version, npm tag, or package URL.

Do not combine target packages with packages from the previous preview. Internal package dependencies are tested as one commit-addressed set.

If the project enforces pnpm's `minimumReleaseAge`, a newly uploaded preview may be too recent to install. Preserve that policy and add only the exact `name@version` entries from the verified manifest to `minimumReleaseAgeExclude`. Do not disable the age check globally.

## Old and New Names

Use this table to find each old API. The sections after it show the larger changes with before and after code.

| Earlier preview                                                                                                       | This preview                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `Block.makeDefinition`, `makeComposition`, `prepareBlock`, `Block.assemble`, `FromAssembly*` headers, `makeNamespace` | `class X extends Block<X, Args, ViewInput>()('X', contract) {}` plus `X.toLayer(Effect.gen(...))`                            |
| `XBlock` export                                                                                                       | `X` (the class) and `XLive` (its Layer)                                                                                      |
| `makeInit(...)`                                                                                                       | `init: (args, { id, path }) => Model`, plus `start: (model, args) => Commands`; init args become the Block's args            |
| `Definition.makeCommand(name, { args, messages, handler })`, `.layer`, `EffectsLayer`                                 | Module-level `Command.define(name, { args, messages })`, listed under `Command: [...]`, handled under `commands`             |
| `makeMount` / `makeMountStream`                                                                                       | `Mount.define` / `Mount.defineStream`, listed under `Mount: [...]`, handled under `mounts`                                   |
| `makeSubscriptions(entry => ...)`                                                                                     | `subscriptions: { name: { dependencies, stream } }`; an always-on source has constant `dependencies`                         |
| `makeManagedResources` / `makeResource`                                                                               | An Effect `RcMap` the Layer creates, held by a Subscription while the Model needs the handle and borrowed by Commands by key |
| `makeBinding(Child, { field })`                                                                                       | `new Child('field', args)` stored in that field                                                                              |
| `makeBinding(Child, { field, key, childField })` / `makeMapBinding`                                                   | `new Child(key, args)` per item, with instances in an array or Record                                                        |
| `makeVariantBinding`                                                                                                  | An instance stored inside a tagged union variant                                                                             |
| `withOutMessagePolicy({ fold })`, `makeOutMessageFold`                                                                | `...Child.on({ Tag: (model, outMessage, instance) => result })`                                                              |
| `makeOutMessageForward`                                                                                               | A `Child.on` handler that returns `{ model, outMessage: Parent.OutMessage.X(...) }`                                          |
| `Binding.requestX()` and other operations                                                                             | `messages: [model.child.send(Child.Message.RequestedX())]`                                                                   |
| `h.block(Binding.embedView({...}))`                                                                                   | `model.child.view(input?)`                                                                                                   |
| `makeFieldsStep`, `makeCommandsStep`, `makeOutMessageStep`, `makeNoopStep`, `makeStep`                                | Plain functions `(model, ...) => ({ model, commands?, outMessage? })`; `Update.combineSteps` still combines pure Steps       |
| `Program.make({ block, routing, Flags, ... })` and `program.provide(ApplicationLayer)`                                | `Program.make(Application, { layer, container, routing, Flags, devTools })`                                                  |
| `Server.renderToString(ApplicationBlock, { Flags }, request)`                                                         | `Server.renderToString(Application, { layer, Flags }, request)`                                                              |
| `toParentMessage(Binding, key, message)`                                                                              | `Block.deliver(Child, 'id' or ['parentId', 'id'], message)`                                                                  |
| `story(update, given(model), ...)` / `scene({ update, view }, ...)`                                                   | `it.effect(() => story(XLive.pipe(Layer.provide(...)), args?, given(model)?, ...))`                                          |

## Effects

### Commands

A Definition-owned Command carried a handler constructor, and completion collected its `.layer` into `EffectsLayer`:

::Snippet{name="previewUpgradeCommandBefore" label="Before: a Definition-owned Command"}

Now `Command.define` declares only the name, args, and result Messages, at module level before the class. The class lists the Command under `Command`, and the Block's Layer supplies the handler under `commands`. The handler constructor's generator becomes the Layer's `Effect.gen`: yield services at its top and close over them in the handler. There is no `EffectsLayer`; the Block's Layer carries its handlers.

::Snippet{name="previewMigrationCommandAfter" label="After: a Command handled in the Block's Layer"}

### Mounts

Mounts follow the same move. Drop `handler` from the definition, list the Mount under `Mount` instead of registering it on a Composition, and supply its handler under `mounts`:

::Snippet{name="previewUpgradeMountBefore" label="Before: a Definition-owned Mount"}

::Snippet{name="previewMigrationMountAfter" label="After: a Mount handled in the Block's Layer"}

### Subscriptions

A `makeSubscriptions` registry declared each entry's Messages, a `when` gate or dependencies, and a handler returning the Stream:

::Snippet{name="previewUpgradeSubscriptionBefore" label="Before: a Subscription registry"}

Now each entry lives in the module's `subscriptions` record. `dependencies` derives a value from the instance's Model, and Foldkit restarts `stream` when that value changes. A `when` gate becomes a Boolean dependency whose `stream` returns `Stream.empty` while it is false. A zero-dependency entry that ran for the Block's whole life returns a constant from `dependencies`. `keepAliveEquivalence` and the second `stream` argument, which reads the latest dependencies, keep a Stream running across dependency changes.

::Snippet{name="previewMigrationSubscriptionAfter" label="After: a Subscription gated by Model state"}

### ManagedResources

A ManagedResource registry acquired a handle while `modelToMaybeRequirements` returned `Some`:

::Snippet{name="previewUpgradeResourceBefore" label="Before: a ManagedResource registry"}

Now the Block's Layer creates an Effect `RcMap` that acquires the handle with `Effect.acquireRelease` the first time a key is requested and releases it when the last holder lets go. A Subscription whose `dependencies` replace `modelToMaybeRequirements` holds the handle while the Model needs it, and Command handlers borrow it with `Effect.scoped(RcMap.get(map, key))`:

::Snippet{name="previewMigrationResourceAfter" label="After: a socket held by a Subscription"}

Requirements that used to flow through `modelToMaybeRequirements` become the Subscription's dependencies and the `RcMap` key. When they change, the Subscription restarts with the new key, which releases the old handle and acquires a new one.

## Init and Update

### Replace makeInit with init and start

`makeInit` produced the starting Model and Commands, and each Binding's `init` selector chose its child's args:

::Snippet{name="previewUpgradeInitBefore" label="Before: Composition init with a child args selector"}

Now the module's `init` returns the starting Model, and `start` returns the Commands init returned. Init arguments become the class's second type parameter and arrive as `init`'s first argument. A parent passes a child's args when it creates the instance, so `ChildInitContext` and `contextToArgs` go away:

::Snippet{name="previewUpgradeInitAfter" label="After: init args and start Commands"}

Foldkit calls `init` when an instance first appears in a Model. Keep it pure; load data with a `start` Command. `Binding.init`, `initAndSet`, `initAndAppend`, `initAndInsert`, and `makeInitIfMissingStep` are all replaced by putting `new Child(id, args)` into the Model: Foldkit runs its `init` and its `start` Commands.

### Replace Composition update and Step helpers

`makeUpdate` took a record of handlers, often built from Definition-owned Step helpers:

::Snippet{name="previewUpgradeUpdateBefore" label="Before: Composition update with Definition-owned Steps"}

Now the module's `update` record has one plain function per Message, `(model, message) => ({ model, commands?, outMessage?, messages? })`. A shared transition is an ordinary named function ending in `Step`. A handler that changes nothing returns `{ model }`. The handlers are typed from the class contract, so they need no annotations, and `withContext` has no replacement because handlers read what they need from the Model. The Settings Block from the Commands section shows both forms; its `changeThemeStep` replaces the `makeStep` producer:

::Snippet{name="previewMigrationCommandAfter" label="After: plain update handlers and a named Step"}

`Update.combineSteps` still applies pure Steps in order. The connected-result rules for mixing Binding operations with local results are gone along with Bindings.

## Children

### Replace a Binding with an instance

A Binding registered the child on the Composition, carried its OutMessage policy and operations, and rendered it through `embedView`:

::Snippet{name="previewUpgradeBindingBefore" label="Before: a Binding with a fold, an operation, and embedView"}

Now the parent creates `new Settings('settings')` in its `init` and stores the instance in the field the Binding named. Its Schema names the child class (`settings: Settings`) instead of `SettingsBlock.Model`. Each part of the Binding has a direct replacement:

- **OutMessage policy.** Spread `...Settings.on({ ChangedTheme: (model, outMessage, instance) => result })` into the update record. One entry covers every Settings instance the parent's Model holds. The handler returns an ordinary result.
- **Operations.** Return `messages: [model.settings.send(Settings.Message.RequestedReset())]`. The operation's Message becomes a public child Message.
- **embedView.** Call `model.settings.view()`, passing the view input when the child declares one.

::Snippet{name="previewMigrationChildAfter" label="After: a child Block held in the parent Model"}

The parent may read the child's state as `model.settings.model`, and never writes it. Instance ids must be unique within the parent.

### Keyed collections and map Bindings

A keyed Binding or `makeMapBinding` held one child per key:

::Snippet{name="previewUpgradeCollectionBefore" label="Before: a keyed Binding"}

Create each instance with a stable id and its args, `new Row('row-3', { label })`, in the update handler that adds it. Store instances in an array or a Record; a HashMap field becomes a Record. `Row.on({...})` handles OutMessages from every instance, and its third argument is the instance that reported it. Wrapper items that held parent-owned data beside the child (`childField`) become structs with an instance field.

::Snippet{name="previewMigrationCollectionAfter" label="After: a keyed collection of child Blocks"}

### Variant children

`makeVariantBinding` placed a child in one variant of a tagged union. Now store the instance inside that variant's struct. The parent's update switches variants by returning a Model with a different variant, which stops the old instance and starts the new one.

### Forwarding OutMessages

`makeOutMessageForward` exposed a child fact as one of the parent's OutMessages:

::Snippet{name="previewUpgradeForwardBefore" label="Before: forwarding a child OutMessage"}

Now a `Child.on` handler returns the parent's OutMessage itself:

::Snippet{name="previewUpgradeForwardAfter" label="After: an on handler returning the parent's OutMessage"}

## Views

`h.block(Binding.embedView({ model, viewInputs }))` rendered a child through its Binding:

::Snippet{name="previewUpgradeViewBefore" label="Before: rendering a Dialog through its Binding"}

Now call the instance's `view` with the same view inputs. Functions in the input run as the parent, so Messages they create are the parent's, and attributes the child builds still go through `childAttributes(...)`. `Block.ViewBuilderFor<typeof Composition>` and owner-specific builder aliases become plain `HtmlBuilder<Message>`.

::Snippet{name="previewMigrationUiAfter" label="After: a Dialog rendered by its instance"}

A Block that renders through parent callbacks declares its view input as the class's third type parameter and receives it as `view(model, h, input)`.

## The Root and Hosts

### Program

`Program.make` took the completed Block, and services came from `program.provide(ApplicationLayer)`:

::Snippet{name="previewUpgradeProgramBefore" label="Before: a Program over the completed root Block"}

Now `Program.make` takes the root class and a single Layer. That Layer provides the root Block, every Block the tree creates, and the ordinary services the Block Layers yield. Provide each child's `Live` Layer to every parent Layer whose Model holds it, or merge them into one Layer provided to the whole tree.

::Snippet{name="previewMigrationEntryAfter" label="After: a Program over the root class and its Layer"}

The root's args decide which host options are required. Args with `flags` require `Flags`, args with `url` require `routing`, and `init` receives both values directly, so the root init's `(flags, url)` parameters become `{ flags, url }` args. `Program.makeElement` follows the same shape for a container-scoped application.

### Server rendering

The server rendered the completed root Block:

::Snippet{name="previewUpgradeServerBefore" label="Before: server rendering the completed Block"}

Now pass the root class and the same Layer the browser uses, with the services the server can supply. The third argument still carries request values such as `flags` and `url`.

::Snippet{name="previewMigrationServerAfter" label="After: server rendering the root class"}

## Tests

A Story ran the composed `update`, and a child fact needed `toParentMessage` with its Binding:

::Snippet{name="previewUpgradeTestBefore" label="Before: a Story over the composed update"}

Now `story` and `scene` take the Block's Layer. Wrap each in `it.effect` from `@effect/vitest`, and add `@effect/vitest` to the package's devDependencies. Without `given`, the test starts from the Model `init` returns. Provide services with `Layer.provide`, and deliver a child's Message with `Block.deliver(Child, 'id', message)`.

::Snippet{name="previewMigrationTestAfter" label="After: Stories over the child and parent Layers"}

Keep these differences in mind:

- The Layer provides exactly one root Block. Provide its children with `Layer.provide`, not `Layer.merge`.
- In tests the Model is the resolved tree: each instance appears as its own Model, as in `model.settings.theme`. `given` may contain `new Child(...)` values.
- An instance is addressed by the ids from the root, never by a collection field name: `Block.deliver(Row, 'row-3', message)` for a row of the root, `Block.deliver(Row, ['table', 'row-3'], message)` for a row of the `table` child.
- `start` Commands of the starting Model do not appear in the Story's Command ledger.
- When sibling instances have identical pending Commands, `Command.at(path, Definition)` targets one instance.
- `Scene.deliver(message)` delivers a Message that is not a user interaction, such as a child Message or a Subscription emission.
- A class Block has no Subscription registry for `Scene.subscriptions(...)` or `Story.Subscription.from(...)` to read. Deliver the Message the Stream would emit, with `Block.deliver` when it belongs to a child.

Delete tests that only exercised removed machinery, such as Binding registration, assembly headers, or operation projection. Port every behavior test.

## UI Components

Each stateful `@foldkit/ui` component is a class with a `Live` Layer. A component's old init config becomes its args, its operations become Messages the parent sends, its folds become `X.on` handlers, and its `embedView` inputs become the input to `model.x.view(...)`. A component that needs another component's Layer provides it inside its own, so `Dialog.DialogLive` already includes Animation.

| Earlier preview                                                                                                                                           | This preview                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dialog.DialogBlock`                                                                                                                                      | `Dialog.Dialog` and `Dialog.DialogLive`; args `{ id, isAnimated?, focusSelector? }`                                                                                 |
| `Popover.PopoverBlock`                                                                                                                                    | `Popover.Popover` and `Popover.PopoverLive`; args `{ id, isAnimated?, isModal?, contentFocus? }`                                                                    |
| `Animation.AnimationBlock`                                                                                                                                | `Animation.Animation` and `Animation.AnimationLive`; args `{ id?, isShowing? }`                                                                                     |
| `Calendar`, `DatePicker`, `DragAndDrop`, `FileDrop`, `HoverIntent`, `Slider`, `Tooltip` Blocks                                                            | The same pattern: `X.X` and `X.XLive`, with the old init config as args                                                                                             |
| `Menu.makeBlock<Item>()`, `Listbox.makeBlock`, `Combobox.makeBlock`, `RadioGroup.makeBlock`, `Tabs.makeBlock`, `VirtualList.makeBlock`, `Toast.makeBlock` | `make`, returning a class declared with its implementation, so the class is its own Layer: `const ActionMenu = Menu.make<Action>()` and `Layer.provide(ActionMenu)` |
| `Binding.requestOpen()`, `requestClose()`, `requestSelectItem(...)`                                                                                       | `send(X.Message.RequestedOpen())`, `RequestedClose()`, `RequestedSelectItem({ ... })`                                                                               |
| `inform*Changed(...)` operations                                                                                                                          | `InformedOf*` Messages, such as `Slider.Slider.Message.InformedOfRangeChange({ min, max })`                                                                         |
| Folds such as `Opened`, `Closed`, `Selected`                                                                                                              | `...Dialog.Dialog.on({ Opened, Closed })`, `...ActionMenu.on({ Selected })`                                                                                         |
| `model.dialog.isOpen` in a parent                                                                                                                         | `model.dialog.model.isOpen`; in tests, `model.dialog.isOpen`                                                                                                        |
| `ToastBlock.test.drainEntry({ binding, key?, ... })`                                                                                                      | `T.test.drainEntry({ path?, entryId, version? })`                                                                                                                   |

Create each factory class once at module scope; the `foldkit/selection-block-factory-at-module-scope` lint rule reports factories created inside functions. The [UI overview](/ui/overview) and each component page show the current calls.

## Organize Files

The old split layout had `definition.ts`, `composition.ts`, `init.ts`, `update.ts`, `view.ts`, and `block.ts` for each feature. Collapse it:

- Each Block lives in one file named for it in camelCase, such as `issueBoard.ts`, holding its Message and OutMessage unions, Model Schema, Command and Mount definitions, class, and `Live` Layer. Remove the feature's `index.ts` barrel.
- A Block too large to read in one file extracts a feature that owns its own state, effects, or lifecycle into a child Block in its own file instead of splitting into `message.ts`, `model.ts`, `update.ts`, `command.ts`, or `view.ts`.
- `definition.ts`, `composition.ts`, `composition/` policy modules, and `init.ts` have no counterpart. Their contents move into the class, the Block's Layer, and the parent's update record.

The recursive-initializer and import-cycle workarounds for reciprocal Binding policies go away, since policies are `Child.on` entries in the parent's own update record. See [Project Organization](/patterns/project-organization).

## Upgrade from Per-Instance Constructors {#per-instance-constructors}

The class Blocks preview before this one implemented a Block with `X.make(Effect.fn(function* (id, args) { ... }))`. That constructor ran once for every instance, so it could close over the instance's id and args, yield child instances, and acquire resources for one instance. In this preview, `X.toLayer(Effect.gen(function* () { ... }))` runs once for the whole Block, and an instance is plain data. Anything the constructor captured for one instance moves into that instance's Model.

::Snippet{name="previewUpgradeClassBlockBefore" label="Before: a constructor that ran once per instance"}

::Snippet{name="previewUpgradeClassBlockAfter" label="After: one Layer for every Counter"}

Apply these changes to each Block:

| Per-instance constructor preview                                    | This preview                                                                                                   |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `X.make(Effect.fn(function* (id, args) { ... }))`                   | `X.toLayer(Effect.gen(function* () { ... }))`                                                                  |
| `model: { ... }`                                                    | `init: (args, { id, path }) => ({ ... })`                                                                      |
| `id` or `args` read in a handler or view                            | A Model field set by `init`, passed to Command handlers as Command args                                        |
| `start: [Command()]`                                                | `start: (model, args) => [Command(...)]`                                                                       |
| `const child = yield* new Child('child', args)`                     | `new Child('child', args)` where the value is needed, usually in `init` or an update handler                   |
| `const row = yield* Child.each('rows', args)` and `row(key, args?)` | `new Child(key, args)`, always with explicit args                                                              |
| `child.on({ ... })`, `child.onAll({ ... })`, `row.on({ ... })`      | `Child.on({ ... })` or `Child.onAll({ ... })`, merged into one entry per Block; branch on `instance.id`        |
| `child.when(predicate)`                                             | `Child.when(predicate)`                                                                                        |
| `stream: source`                                                    | `subscriptions: { name: { dependencies: model => model.id, stream: () => source } }`                           |
| `expose`, `instance.use`, `NotConnected`, the fourth type parameter | An Effect `RcMap` the Layer creates, held by a Subscription and borrowed by Commands with a key from the Model |
| `yield* Block.Path`                                                 | `init`'s second argument, `{ path }`, stored in the Model when the Block needs it                              |
| A service provided to one instance's declaration                    | A Model field that selects the behavior, passed as a Command arg; tests swap the service for the whole Block   |
| `Block.deliver(Child, ['rows', 'row-3'], message)`                  | `Block.deliver(Child, 'row-3', message)`: the path is parent ids then the child's id                           |
| `Command.at(['rows', 'row-3'], Definition)`                         | `Command.at('row-3', Definition)`                                                                              |

Instance lifetimes follow the Model in the same way. Foldkit starts an instance's `start` Commands and Subscriptions when its path first appears and stops them when the path leaves, interrupting its in-flight Commands. The path is the parent's path plus the instance id, so ids must be unique among one parent's children, and moving an instance between fields of the same parent keeps it running.

A parent's Layer requires the Layers of the Blocks its Model Schema holds. Wiring stays `ParentLive.pipe(Layer.provide(ChildLive))`.

## Native TypeScript Tooling

The target scaffold pins its `typescript` development dependency to native TypeScript `7.1.0-beta`. Existing applications using native TypeScript can adopt the same exact version to use the compiler version checked for this preview. This tooling update is separate from the API changes above.

After installation, confirm that the project's typecheck command and editor language server resolve the intended installed compiler. Restart the language server after changing its package or SDK path. A different global compiler or editor server can produce different performance and diagnostics. Preserve any separate compatibility compiler used by other tools.

### Optional editor setup: tsrs

[tsrs](https://github.com/oxc-project/tsrs/blob/467182f2402b140897e8a02d7a25699db0e79e2a/docs/LSP.md) is an experimental TypeScript language server. Testing is limited to a Neovim trial and the paired benchmarks recorded in [#1737](https://github.com/foldkit/foldkit/issues/1737), both against the earlier preview. Keep the project's official TypeScript dependency, typecheck scripts, and CI unchanged.

#### Install and select the server

Install the tested version outside the application, then check the executable's identity:

::Snippet{name="previewTsrsInstall" label="Install the pinned editor server"}

The npm package version identifies the tsrs release; its `--version` output also identifies the TypeScript version it implements, so record both.

For Neovim 0.11 or later, use the installed executable in your LSP configuration. Replace the example path with its absolute installation path. Keep exactly one TypeScript server enabled for the trial buffers by disabling the previous server there.

::Snippet{name="previewTsrsNeovim" label="Select tsrs in Neovim"}

Restart Neovim and open a TypeScript file in the intended project. Run `:checkhealth vim.lsp` and confirm that `foldkit_tsrs_trial` is attached, with the intended executable and project root. Try completion, hover, and a diagnostic that appears and clears after an edit. These checks confirm the selected editor server; the project's official typecheck remains the verification gate.

To revert, remove the trial configuration, restore the previous server's enablement, and restart Neovim. Confirm the previous client is attached before removing the isolated installation.

See the [official editor setup](https://github.com/oxc-project/tsrs/blob/467182f2402b140897e8a02d7a25699db0e79e2a/docs/LSP.md) for other editors and current limitations.

## Vite Security Patches

Update an installed Vite to `8.3.3` or a patched release on its existing supported line, such as `8.2.4` or `8.1.6`. The preview scaffold uses the patched `8.3` line. Refresh the lockfile and confirm that it no longer resolves `launch-editor@2.14.1` or an earlier version.

The [upstream advisory](https://github.com/advisories/GHSA-587h-7wmj-h5pm) describes the affected Windows editor-launch path and related WSL conditions. Keep existing dependency placement and verify the application's normal development and build commands after updating.

## Refresh Agent Context

If the project already vendors Foldkit at `repos/foldkit`, pin it to the full `sourceCommit` from `preview-release.json`, not to `main` and not to a guessed release tag. Refresh any copied Foldkit skills from that subtree; existing symlinked skill directories follow the new subtree automatically. If the project maintains the managed `FOLDKIT.md` snapshot, replace it with `repos/foldkit/packages/create-foldkit-app/templates/base/FOLDKIT.md`.

A project without those assets can use this deployment's documentation and commit-pinned source links directly; adding vendored source or skills is optional. Preserve the project's `AGENTS.md` and any other project-owned instructions. `FOLDKIT.md` is the replaceable framework snapshot; `AGENTS.md` belongs to the project.

When asking a coding agent to perform the upgrade, give it this page URL and the same-origin `/preview-release.json` URL. That supplies both the upgrade path and the verified target manifest without relying on remembered API names.

## Verify the Upgrade

Run the project's formatter, typecheck, lint, tests, and build after these edits. Include test files in typechecking and exercise the browser, SSR or SSG, or embedding path the application uses. Confirm that the lockfile resolves one exact Foldkit snapshot.

Search the source for each removed name before declaring the upgrade finished: `makeDefinition`, `makeComposition`, `prepareBlock`, `Block.assemble`, `FromAssembly`, `makeBinding`, `makeMapBinding`, `makeVariantBinding`, `withOutMessagePolicy`, `embedView`, `h.block`, `EffectsLayer`, `toParentMessage`, `program.provide`, and `makeBlock`. From the per-instance constructor preview, search for `.make(Effect.fn`, `yield* new`, `.each(`, `expose`, `.use`, `NotConnected`, and `Block.Path`. Each remaining hit is a place the table above has not been applied.

Enable the current Foldkit Oxlint preset. The rules for Bindings and Compositions, such as `no-binding-write-coordination`, `no-manual-composition-routing`, and `no-completed-block-model-in-schema`, are gone; remove them from any lint configuration that names them. See [the Oxlint plugin](/tooling/oxlint-plugin) for the current rules.

## Troubleshooting

- **The update record is missing a property.** Every Message tag needs a handler, including Command result Messages. A handler that changes nothing returns `{ model }`.
- **`commands` or `mounts` is missing a property.** Add a handler for every Command and Mount listed on the class.
- **A handler's Effect still requires a service.** Yield the service in the Block's Layer and close over it, then provide it in the Program's Layer.
- **`Program.make` or `story` rejects the Layer.** The Layer still requires a child Block or a service. Provide each child's `Live` Layer to its parent's Layer, then the services.
- **A parent Model field rejects a child Model.** Use the child class as the field's Schema (`settings: Settings`) and store `new Settings('settings')`, not `SettingsBlock.Model.make(...)`.
- **A child does not start, or starts twice.** Foldkit starts an instance when its path (parent path plus id) first appears in the Model and stops it when the path leaves. Moving an instance between fields of one parent keeps it running; a new id starts a fresh one.
- **Foldkit reports a duplicate id.** Two children of one parent share an id. Give each instance an id that is unique among its parent's children, such as a domain id or a counter stored in the parent's Model.
- **Installed packages show different canary hashes.** Reapply the exact manifest versions and regenerate the lockfile before diagnosing TypeScript errors.
- **pnpm refuses a newly uploaded package because of its age.** Add that exact manifest entry to `minimumReleaseAgeExclude`. Keep the project's minimum release age enabled.
