# Migrate from Stable Foldkit

## Overview

This guide takes an application on the current stable Foldkit APIs to the class Blocks in this integration preview. If the application already uses an earlier Blocks preview, with Definitions, Compositions, and Bindings, use [Upgrade a Previous Preview](/preview-upgrade) instead.

In stable Foldkit, a feature is a set of loose values: a Model Schema, a Message union, `init`, `update`, `view`, and Commands that carry their own `execute` Effects. The parent wires each child in by hand with a `Got*Message` wrapper and an `Update.foldChild` call. In the preview, a feature is a Block: a class that declares the feature's contract, plus a constructor that returns its starting Model, update handlers, Command handlers, and view. A parent holds child instances in its Model, and Foldkit routes each instance's Messages back to it.

The architecture does not change. The Model is still the source of truth, Messages still record facts, update is still pure, and the Runtime still performs the Commands update returns. What moves is where each piece is written:

- Command, Mount, and Subscription implementations move out of their definitions and into the Block's constructor, where they close over the services it yields.
- `init` becomes the constructor's returned `model`, plus `start` Commands for the work init used to return.
- Child wiring becomes instances held in the parent Model. The parent sends a child Messages and handles its OutMessages; it no longer wraps or unwraps the child's Messages.
- `Runtime.makeApplication` becomes `Program.make(Application, { layer, ... })`, where the Layer provides the root Block, every Block it creates, and the application's services.

## Pin the Exact Preview

Use this integration preview's ready announcement and the banner at the top of the same deployed site to identify the target. The deployment's [`preview-release.json`](/preview-release.json) records the full source commit and the exact package map used to build the docs and embedded examples. Update only the Foldkit packages the project already uses, pin their manifest versions exactly, and preserve whether each belongs in dependencies or devDependencies.

The deployment URL and manifest belong together. Do not copy a guide from one preview and package versions from another, and do not replace an exact canary version with `latest`, a range, or the moving canary site. When reading this page through its exported Markdown, resolve `/preview-release.json` against the deployment that served the Markdown.

For an agent-assisted migration, give the agent this guide's full deployment URL and the `/preview-release.json` URL from that same deployment. Ask the agent to preserve the application's existing behavior, run its real checks, and fix type errors where the contract is declared instead of adding broad casts.

Update every installed Foldkit package named by the manifest as one snapshot. Keep `effect` and `@effect/platform-browser` on the exact peer versions declared by those packages. Commit the resulting lockfile only after the application compiles and its tests pass.

The stable "before" examples on this page use the published `foldkit@0.169.0` and `@foldkit/ui@0.169.0` APIs with `effect@4.0.0`.

If the project already maintains a version-pinned Foldkit source reference or subtree, repin it to the `sourceCommit` recorded by the deployment manifest. If it already maintains generated `FOLDKIT.md` guidance or installed Foldkit skills, refresh those from the same snapshot. A migration does not require adding a source checkout, guidance file, or skills to a project that does not maintain them.

## Check Compiler and Editor Setup

The target scaffold uses native TypeScript `7.1.0-beta`. Follow the shared [native TypeScript tooling guidance](/preview-upgrade#native-typescript-tooling) when updating an existing native compiler or editor SDK. Keep that tooling choice separate from the application API migration below, and verify the application's normal checks with the compiler it actually resolves.

Apply the shared [Vite security patch guidance](/preview-upgrade#vite-security-patches) when the project resolves an affected Vite or `launch-editor` version. The preview scaffold includes the patched Vite line.

## Inventory the Stable Application

Take one pass through the application before editing. Record the baseline result of its existing typecheck, lint, unit tests, browser tests, and production build. A failure that already exists belongs in the baseline; a new failure belongs to the migration.

List these places in the code:

- Every root created with `Runtime.makeApplication` or `Runtime.makeElement`, with its Flags, routing, Ports, DevTools, Subscriptions, ManagedResources, `resources` Layer, and container.
- Every Submodel stored in a parent Model, rendered through `Submodel.defineView` and `h.submodel`, or wired into its parent through `Update.foldChild`, `Update.foldChildAt`, `Update.foldChildInit`, or `Update.foldChildInits`.
- Every hand-written `Got*Message` variant and its `toParentMessage` callback.
- Every Command with `execute`, Subscription with `dependenciesToStream`, Mount with `execute`, and ManagedResource with `acquire` and `release`.
- Every child Model helper that a parent calls directly, especially one that rewrites a child field without going through the child's update.
- Every OutMessage fold, keyed collection, optional child, and child that is created after startup.
- Every Story or Scene test that calls `update` directly or constructs a child wrapper Message.

Write the child tree down as parent → field → child. The tree is the migration plan. Migrate leaf features first, then their parents, and finish with the root Block and the browser entry.

## Move Commands into the Block

A stable Command carries the Effect that runs each invocation:

::Snippet{name="previewMigrationStableCommandBefore" label="Stable before: Command execution"}

In the preview, `Command.define` declares only the Command's name, args, and result Messages. The Block that returns the Command lists it under `Command: [...]` in its class, and its constructor supplies one handler per listed Command under `commands`. The constructor yields services once per instance; each handler closes over them and runs once per invocation with that invocation's args:

::Snippet{name="previewMigrationCommandAfter" label="After: a Command handled in the Block constructor"}

Make these changes for each Command:

1. Remove `execute` from the `Command.define` call. Keep the name, `args`, and `messages`.
2. Declare the Message union and the Command at module level, before the class, so the Command can name its result Messages.
3. List the Command in the class contract under `Command`.
4. Move the Effect into the constructor's `commands` record. Yield any service the old `execute` read, such as `SettingsStore`, at the top of the constructor.

A handler must return an Effect with no remaining requirements. The services it needs come from the constructor, so the Program's Layer provides them. Leaving out the handler for a listed Command is a type error.

## Move Subscriptions into the Block

A stable Subscription registry maps the Model to a dependencies Schema and the dependencies to a Stream:

::Snippet{name="previewMigrationStableSubscriptionBefore" label="Stable before: Subscription registry"}

In the preview, a Subscription is an entry in the constructor's `subscriptions` record. `dependencies` derives a value from the Block's Model; Foldkit compares it after each update and restarts `stream` when it changes. An event source that runs for as long as the Block exists is the constructor's `stream` field instead.

::Snippet{name="previewMigrationSubscriptionAfter" label="After: a Subscription gated by Model state"}

The dependencies no longer need a Schema. Return `Stream.empty` for the dependencies that should produce no Messages. When a Stream should keep running across some dependency changes, add `keepAliveEquivalence` and read the latest dependencies through the second `stream` argument.

## Move Mounts into the Block

A stable Mount carries the Effect that runs on its element:

::Snippet{name="previewMigrationStableMountBefore" label="Stable before: Mount execution"}

Mounts move the same way Commands do. `Mount.define` or `Mount.defineStream` declares the name, args, and result Messages; the class lists the Mount under `Mount: [...]`; the constructor supplies its handler under `mounts`. The view attaches it with `h.OnMount(...)` as before.

::Snippet{name="previewMigrationMountAfter" label="After: a Mount handled in the Block constructor"}

## Replace ManagedResources with a Child Block

A stable ManagedResource acquires a handle while the Model meets a condition and releases it when the condition ends:

::Snippet{name="previewMigrationStableResourceBefore" label="Stable before: ManagedResource entry"}

In the preview, the handle's lifetime is a child Block's lifetime. The child acquires the handle in its constructor with `Effect.acquireRelease` and exposes it with `expose`. The parent keeps the child in an `Option` field: putting the instance in the Model acquires the handle, and removing it releases the handle. Parent Commands read the handle with `instance.use`, which fails with `NotConnected` while the instance is not in the Model.

::Snippet{name="previewMigrationResourceAfter" label="After: a socket owned by a child Block"}

The four-element type parameter list `Block<ChatSocket, void, void, WebSocket>` declares the exposed type. The `onAcquired`, `onReleased`, and `onAcquireError` Messages become ordinary facts: the parent already knows when it adds or removes the instance, and a failure the child can observe becomes a child Message or OutMessage.

## Replace Submodels with Child Blocks

Stable parent wiring repeats the child's Message contract inside a wrapper and routes it through `Update.foldChild` and `h.submodel`:

::Snippet{name="previewMigrationStableChildBefore" label="Stable before: Submodel wiring"}

In the preview, the parent yields an instance in its constructor with `yield* new Settings('settings')` and puts it in its Model. The parent's Schema names the child class itself (`settings: Settings`), not the child's Model Schema. Foldkit routes the instance's Messages to the instance, so the wrapper Message, `toParentMessage`, and the fold all go away:

::Snippet{name="previewMigrationChildAfter" label="After: a child Block held in the parent Model"}

The parent and child now meet in three places:

- **Changing the child.** The parent returns `messages: [model.settings.send(Settings.Message.RequestedReset())]`. The child's update decides what that Message does. A stable helper such as `Settings.reset(model.settings)`, which rewrote the child's Model from the parent, becomes a `Requested*` or `InformedOf*` Message on the child.
- **Reacting to the child.** The parent spreads `...settings.on({ ChangedTheme: (model, outMessage) => result })` into its update record. Name every OutMessage variant the parent handles.
- **Rendering the child.** The parent calls `model.settings.view()`. A child that renders through parent callbacks declares a view input type and receives it as `model.settings.view({ toView })`.

The parent may read the child's current state as `model.settings.model`. It never writes it.

### Keyed collections

A stable keyed collection, folded with `Update.foldChildAt`, becomes an array or Record of instances. Yield one factory in the constructor with `Row.each('rows', args)`, then call it with a stable key to create each instance. Handle OutMessages from every instance with the factory's `.on`; the third handler argument is the instance that reported it.

::Snippet{name="previewMigrationCollectionAfter" label="After: a keyed collection of child Blocks"}

Key each instance by an identifier that stays with it, never by array position. Removing an instance from the Model closes its scope, which stops its Streams and releases anything its constructor acquired. Putting the same instance back constructs it fresh.

### Optional and variant children

A child that exists only some of the time lives in a `Schema.Option` field or inside one variant of a tagged union. Yield the instance once in the constructor and put it into the Model when it should exist. Instances can live in plain objects, arrays, `Option`, and tagged structs, but not in `HashMap`, `HashSet`, or class instances; convert those to arrays or Records.

## Replace init with the Constructor

The constructor replaces `init`. It runs once per instance, synchronously, when the instance enters its parent's Model. It returns the starting `model` and, under `start`, the Commands init used to return. Arguments the stable `init` received become the Block's constructor args, declared as the class's second type parameter and passed as `new Row('row-1', { label })` or through an `each` factory.

The constructor must not do asynchronous work. Load data with a `start` Command and handle its result Message in update. Stable `Update.foldChildInit` and `foldChildInits` calls go away: each child's constructor produces its own Model and `start` Commands, and Foldkit runs them when the instance appears.

## Build the Root Block and Program

Stable `Runtime.makeApplication` combines the application's behavior with its browser host:

::Snippet{name="previewMigrationStableRootBefore" label="Stable before: application and browser host"}

In the preview, the root is an ordinary Block named `Application`. Its constructor args declare what the host must supply:

| Root args                              | The Program must pass |
| -------------------------------------- | --------------------- |
| none                                   | nothing extra         |
| `Readonly<{ flags: Flags }>`           | `Flags`               |
| `Readonly<{ url: Url }>`               | `routing`             |
| `Readonly<{ flags: Flags; url: Url }>` | `Flags` and `routing` |

::Snippet{name="previewMigrationRootAfter" label="After: the root Block receiving Flags"}

`entry.ts` builds the Program from the class and a Layer. The Layer provides the root Block, every Block the tree creates, and the application's ordinary services, such as HTTP, storage, and the `SettingsStore` the Settings constructor yields. The stable `resources` Layer becomes part of that Layer.

::Snippet{name="previewMigrationEntryAfter" label="After: the browser Program"}

Make these changes:

1. Declare `class Application extends Block<Application, Args>()('Application', { Model, Message, ... }) {}` and implement it with `Application.make(...)` as `ApplicationLive`.
2. Rename a root route union named `AppRoute` to `ApplicationRoute`.
3. Move the container, Flags Schema, routing, Ports, DevTools, and other host options into `Program.make(Application, { layer, ... })`.
4. Provide each child Block's Layer to every parent Layer that creates it, or merge them into one Layer provided to the whole tree.
5. Replace `devTools: { Message }` with `devTools: { dispatch: true }` when an external MCP client should discover and dispatch Messages. Omit `devTools` to keep inspection with dispatch disabled, or pass `devTools: false` to turn DevTools off.

Routing Messages whose payloads are `{ request }` and `{ url }` can be passed directly: `routing: { onUrlRequest: Application.Message.ClickedLink, onUrlChange: Application.Message.ChangedUrl }`.

### Choose the host

| Host                     | Preview entry                                                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser page             | `Program.make(Application, options)`, then `Runtime.run` or `Runtime.hydrate`                                                                                               |
| Container-scoped element | `Program.makeElement(Application, options)`, then `Runtime.run` or `Runtime.embed`                                                                                          |
| SSR or SSG               | `Server.renderToString(Application, { layer, Flags }, { flags, url })` from `foldkit/experimental`; the browser hydrates a `Program.make` Program built from the same class |

A page Program's root view returns `{ title, body }` to set the document title; when it returns plain Html, the title is the Block id. An element Program's root view returns Html. The server renders the same class and Layer as the browser:

::Snippet{name="previewMigrationServerAfter" label="After: server rendering the root Block"}

`Program.makeElement` and `Runtime.embed` do not hydrate. Keep the existing server Flags handoff and build-id policy when migrating an SSR or SSG application; the [Server Rendering guide](/core/server-rendering) describes that host contract.

## Migrate UI Components

Each `@foldkit/ui` component with state is a Block. Hold an instance in the parent Model, send it `Requested*` Messages, handle its OutMessages with `.on`, render it with `model.dialog.view({ toView })`, and provide its Layer:

::Snippet{name="previewMigrationUiAfter" label="After: a Dialog held by its parent"}

A component module exports its class under the component name and its Layer with a `Live` suffix, such as `Dialog.Dialog` and `Dialog.DialogLive`. A component whose state depends on an item type keeps a factory: `const ActionMenu = Menu.makeBlock<Action>()` returns a class, and `ActionMenu.Live` is its Layer. Create each factory class once at module scope. Each component's constructor args replace the stable init config, such as `{ id, isAnimated? }` for Dialog. The [UI overview](/ui/overview) and each component page show the current calls.

## Migrate Tests

A stable Story drives `update` directly:

::Snippet{name="previewMigrationStableTestBefore" label="Stable before: Story over update"}

In the preview, a Story or Scene runs against a Block's Layer. Without `given`, it starts from the Model the constructor returns. Tests use `@effect/vitest`: wrap each Story or Scene in `it.effect`, and add `@effect/vitest` to the package's devDependencies. Provide the services the constructor yields with `Layer.provide` on the Layer.

::Snippet{name="previewMigrationTestAfter" label="After: Stories over the child and parent Layers"}

Keep these differences in mind:

- The Layer passed to `story` or `scene` provides exactly one root Block. Provide its children with `Layer.provide`, not `Layer.merge`.
- In tests the Model is the resolved tree: each instance appears as its own Model, as in `model.settings.theme`. `given` can set child state but cannot add or remove instances; do that with Messages.
- Deliver a child's Message with `Block.deliver(Child, 'id', message)`, or `Block.deliver(Child, ['rows', 'row-3'], message)` for an instance created by `each`. A child's Command result is routed back to the child automatically.
- `start` Commands of the starting Model do not appear in the Story's Command ledger.
- If a stable parent Story constructed a `Got*` wrapper to simulate a child UI event, deliver the child Message with `Block.deliver` or move the interaction to a parent Scene that clicks the rendered control.

See [Story](/testing/story) and [Scene](/testing/scene) for the full step API.

## Organize Files

Put each Block in one file named for it in camelCase: `settings.ts` for `Settings`, `issueBoard.ts` for `IssueBoard`, and `application.ts` for the root. The file holds the Block's Message and OutMessage unions, Model Schema, Command and Mount definitions, class, and `Live` Layer with its update handlers, Command handlers, and view. A stable Foldkit feature split across `message.ts`, `model.ts`, `update.ts`, `command.ts`, and `view.ts` becomes one file, and its `index.ts` barrel goes away.

The other source files are not Blocks:

| File                          | Owns                                                   |
| ----------------------------- | ------------------------------------------------------ |
| `entry.ts`, `entry.server.ts` | `Program.make` and `Runtime.run`, or the server render |
| `services.ts`                 | The root `ApplicationLayer` of ordinary services       |
| `route.ts`                    | `ApplicationRoute`, when several Blocks share it       |
| `domain/*.ts`                 | Schemas and pure functions used by more than one Block |

When a Block is too large to read in one file, extract a feature that owns its own state, effects, or lifecycle into a child Block in its own file. Render-only markup stays in the parent's file as view functions. Group a page with the child Blocks only it uses in a folder named for the page, such as `page/settings/settings.ts` and `page/settings/themePicker.ts`. The [Project Organization guide](/patterns/project-organization) covers the layout in detail.

## Lint the Migrated Application

Enable the current Foldkit Oxlint preset before treating the migration as finished. Its rules check Block naming (`foldkit/block-name-matches-variable`), keyed rows and instances, selection Block factories created inside functions, Command construction, and Model state. Fix the reported code instead of disabling the rule. See [the Oxlint plugin](/tooling/oxlint-plugin) for the rule list.

After typecheck and lint pass, run the application's full Story, Scene, unit, integration, browser, SSR or SSG, and production build checks that were green in the baseline. Verify the lockfile contains only the exact preview snapshot from the deployment manifest and the exact compatible Effect peers.

### Linked Packages and Duplicate Foldkit Copies

A linked adapter or component library can load a second Foldkit copy even when its source imports look correct. The resulting errors often involve same-shaped Block classes, Messages, or Layers that fail identity or type checks.

Declare `foldkit` and every relevant `@foldkit/*` package as peer dependencies of the linked library. Put the same exact preview versions in that library's development dependencies for its own build and tests. The consuming application must also declare those exact preview versions directly. Do not ship a separate Foldkit copy as a regular dependency of the linked library.

Run `pnpm why foldkit` and `pnpm why @foldkit/ui` from the consuming application, adjusting the second command for each Foldkit package in use. Confirm that the linked library and application resolve one installed snapshot. Then verify that the application's `@foldkit/vite-plugin` build resolves both through one Foldkit module graph. Add narrowly scoped Vite `resolve.dedupe` entries or a `resolve.noExternal` entry only when graph inspection shows that a linked package is otherwise resolved or externalized separately.

Type casts and recreated same-shaped definitions can silence or move a compiler error, but they do not repair a duplicate Foldkit graph.

## Required Changes and Optional Cleanup

Finish the required column before broadening the migration.

| Required for the preview                                                  | Optional after behavior is green                                        |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Pin one exact manifest snapshot.                                          | Extract a feature from a large Block into a child Block.                |
| Move Command, Mount, and Subscription implementations into constructors.  | Rename unrelated domain helpers for consistency.                        |
| Declare every feature as a Block class with a `Live` Layer.               | Extract shared update transitions into named Steps.                     |
| Hold children as instances and remove `Got*Message` wrappers.             | Add more focused Story or Scene coverage beyond the migration baseline. |
| Replace parent rewrites of a child Model with Messages sent to the child. | Reorganize domain modules that do not take part in the Block tree.      |
| Move init into constructors and `start` Commands.                         | Adopt additional APIs unrelated to Blocks or Program.                   |
| Create the root `Application` Block and move host options to Program.     | Perform stylistic rewrites that do not fix an API error.                |
| Update affected tests and satisfy current lint rules.                     |                                                                         |

Avoid mixing optional cleanup into the first compiling pass. A smaller diff makes it easier to prove that the migration preserved behavior.

## Compiler Error Guide

Start with the first error for a Block. A missing update handler is reported on the update record before errors that depend on it.

| Error or symptom                                                      | What to inspect                                                                                                                                                          |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The update record is missing a property                               | Every Message tag needs a handler, including Command result Messages. A handler that changes nothing returns `{ model }`.                                                |
| `execute`, `dependenciesToStream`, or `acquire` is rejected           | Move the Effect into the constructor's `commands`, `subscriptions`, or a child Block's constructor.                                                                      |
| `commands` or `mounts` is missing a property                          | Add a handler for every Command and Mount listed on the class.                                                                                                           |
| A handler's Effect still requires a service                           | Yield the service in the constructor and close over it. Provide it in the Program's Layer.                                                                               |
| `Program.make` rejects the Layer                                      | The Layer still requires a child Block or a service. Provide each child's `Live` Layer to its parent's Layer and the services below them.                                |
| `Program.make` asks for `routing` or `Flags`                          | The root's args include `url` or `flags`. Pass the matching option, or remove the arg.                                                                                   |
| A Model field rejects a child Model value                             | Use the child class as the field's Schema (`settings: Settings`) and store the instance yielded in the constructor.                                                      |
| A `commands` entry in an update result is rejected                    | Return only Commands listed on the class or Commands that produce this Block's own Messages. List the Command, or move it to the Block that handles its result.          |
| `model.child.view()` reports a missing argument                       | The child declares a view input. Pass it, such as `model.dialog.view({ toView })`.                                                                                       |
| `Runtime.makeApplication` or `Runtime.makeElement` is missing         | Build the root Block, then call `Program.make` or `Program.makeElement`.                                                                                                 |
| `Submodel.defineView`, `h.submodel`, or `Update.foldChild` is missing | Hold the child as an instance and render it with `model.child.view()`.                                                                                                   |
| A linked package reports incompatible same-shaped Foldkit types       | Use `pnpm why` to find duplicate copies, align the library's peers and development dependencies with the app's exact preview versions, and verify the Vite module graph. |

Do not fix these errors with `as`, `unknown as`, `any`, or a generic `Layer.Layer<any>`. Fix the class contract, constructor, or Layer that is missing the piece.

## Completion Checklist

The migration is complete when all of these statements are true:

- The installed Foldkit packages match one deployment's `/preview-release.json` exactly.
- Every feature a parent uses is a Block class with a `Live` Layer.
- No Command, Mount, or Subscription definition carries its own implementation.
- Every child is an instance held in its parent's Model, and no Message union contains a `Got*Message` wrapper.
- Parents change children only by sending Messages and react to them only through OutMessages.
- The root is `Application`; browser hosting is a Program; SSR renders the same class.
- Typecheck, lint, Story, Scene, integration, browser, server-rendering, and production build checks pass to the extent they belong to the application.
- No broad cast or disabled lint rule hides a Block, Layer, Message, or OutMessage error.

After that baseline is green, use [Blocks](/core/block), [Runtime](/core/runtime), [Project Organization](/patterns/project-organization), and [Testing](/testing) as the references for ongoing work.
