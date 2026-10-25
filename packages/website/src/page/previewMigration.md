# Migrate from Stable Foldkit

This guide starts with an application on the current stable Foldkit APIs and ends with the APIs documented by this integration preview. It goes directly to the final Definition → Composition → completed Block → Program design. It does not ask you to reproduce any intermediate preview API.

If the application already uses an earlier Layers or Blocks preview, use [Upgrade an Earlier Preview](/preview-upgrade) instead.

The migration changes application assembly and effect wiring. Your Model remains the source of truth, Messages remain facts, update remains pure, and the Runtime still performs Commands after update returns them. The new structure makes those boundaries checkable across a complete child graph.

## Pin the Exact Preview

Use this integration preview's ready announcement and the banner at the top of the same deployed site to identify the target. The deployment's [`preview-release.json`](/preview-release.json) records the full source commit and the exact package map used to build the docs and embedded examples. Update only the Foldkit packages the project already uses, pin their manifest versions exactly, and preserve whether each belongs in dependencies or devDependencies.

The deployment URL and manifest belong together. Do not copy a guide from one preview and package versions from another, and do not replace an exact canary version with `latest`, a range, or the moving canary site. When reading this page through its exported Markdown, resolve `/preview-release.json` against the deployment that served the Markdown.

For an agent-assisted migration, give the agent this guide's full deployment URL and the `/preview-release.json` URL from that same deployment. The ready announcement includes prompts with the source commit and package versions already pinned. Ask the agent to preserve the application's existing behavior, run its real checks, and fix type errors at the ownership boundary instead of adding broad casts.

Update every installed Foldkit package named by the manifest as one snapshot. Keep `effect` and `@effect/platform-browser` on the exact peer versions declared by those packages. Commit the resulting lockfile only after the application compiles and its tests pass.

The stable package lane was checked against the published `foldkit@0.169.0` and `@foldkit/ui@0.169.0` APIs with `effect@4.0.0` and `@effect/platform-browser@4.0.0`. Those packages were released from Foldkit commit `7ee214268c602967937b80f6f20d1e831f2e8ab6`.

The stable source examples were also checked at Foldkit main commit `76fa0d1ee2a5f9d06333e83a1ee381eab0ed37d5`. That commit identifies the source used to verify those examples; it is neither a package version nor the candidate target. Coverchart checkpoint `6480e465d27b1179bf7e4acffae5da58f65b339d` provides the tested stable consumer baseline for the separate local migration rehearsal. Local packed-artifact checks support guide preparation; acceptance against the published candidate packages remains a separate release gate.

If the project already maintains a version-pinned Foldkit source reference or subtree, repin it to the `sourceCommit` recorded by the deployment manifest. If it already maintains generated `FOLDKIT.md` guidance or installed Foldkit skills, refresh those from the same snapshot. These steps keep existing project references aligned; a migration does not require adding a source checkout, guidance file, or skills to a project that does not maintain them.

## Check Compiler and Editor Setup

The target scaffold uses native TypeScript `7.1.0-beta`. Follow the shared [native TypeScript tooling guidance](/preview-upgrade#native-typescript-tooling) when updating an existing native compiler or editor SDK. Keep that tooling choice separate from the application API migration below, and verify the application's normal checks with the compiler it actually resolves.

Apply the shared [Vite security patch guidance](/preview-upgrade#vite-security-patches) when the project resolves an affected Vite or `launch-editor` version. The preview scaffold includes the patched Vite line.

## Inventory the Stable Application

Take one pass through the application before editing. Record the baseline result of its existing typecheck, lint, unit tests, browser tests, and production build. A failure that already exists belongs in the baseline; a new failure belongs to the migration.

Inventory these boundaries:

- Every root created with `Runtime.makeApplication` or `Runtime.makeElement`, including its Flags, routing, Ports, DevTools, Subscriptions, ManagedResources, and container fields.
- Every Submodel stored in a parent Model, rendered through `Submodel.defineView` and `h.submodel`, or wired into its parent through an update, initialization, Subscription, or ManagedResource lift.
- Every Command with `execute`, Subscription with `dependenciesToStream`, Mount with `execute`, and ManagedResource with inline `acquire` or `release`.
- Every hand-authored `Got*Message` variant and every `Update.foldChild`, `Update.foldChildAt`, `Update.foldChildStep`, `Update.foldChildInit`, and `Update.foldChildInits` call, including each `read`, `write`, `toParentMessage`, OutMessage, and key policy.
- Every child Model helper that a parent calls directly, especially a helper that rewrites a child field without entering the child's update.
- Every OutMessage fold, forwarded OutMessage, child initialization path, keyed collection, optional child, Mount registration, and alternate view.
- Every Story or Scene test that constructs a child wrapper Message, compares a qualified Command name, or manually supplies child lifecycle declarations.

Write down the intended child graph as parent → placement → completed child. The graph is the migration plan. Migrate leaf features first, then their parents, and finish with `ApplicationBlock` and the host entry.

## The New Assembly Model

The final API separates four responsibilities:

| Stage           | What it owns                                                                                                                  | What it does not do                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Definition      | Model, local Message, optional OutMessage and child init contracts; local effects, lifecycle definitions, Steps, and Bindings | It does not fix the complete child graph or implement init, update, or view.     |
| Composition     | Registered Bindings and Mounts; graph-aware init, update, and primary view authoring                                          | It does not start effects or choose a browser host.                              |
| Completed Block | The fixed graph plus init, update, view, local lifecycle declarations, operations, and local `EffectsLayer`                   | It does not choose a container, request Flags, or application Service providers. |
| Program         | Page or element host configuration, including the container, Flags Schema, routing, Ports, and DevTools                       | It does not own feature behavior or handler definitions.                         |

`Block.makeDefinition`, `makeComposition`, `prepareBlock`, `Program.make`, and `Program.makeElement` all return passive values. `Runtime.run`, `Runtime.hydrate`, or `Runtime.embed` builds the selected Layers and starts the application.

For ordinary source Blocks, name the single private zero-argument preparation producer `prepare` and put the matching four-shape export header immediately after it with no blank line. Use a descriptive producer name only when one file genuinely contains multiple preparation producers. Keep the feature barrel focused on its completed Block, and compose parent state with `ChildBlock.Model`. The recommended `foldkit/no-completed-block-model-in-schema` rule guards inferred assembly dependencies while accepting the recognized checked boundary. See [Model Schema dependencies](/patterns/project-organization#keep-model-schema-dependencies-small). A package shipping declaration files uses a named interface over the same checked header for each public Block and verifies its emitted public entrypoints; a JavaScript-only application can keep the checked value annotation. See [public Block declarations](/patterns/project-organization#declaration-emission).

The completed Block is the boundary that parents consume. It carries its Model Schema, complete Message Codec, optional OutMessage matcher, operations, view contract, lifecycle declarations, handler graph, and child graph together.

## 1. Move Effect Implementations into Layers

Migrate effect definitions before composing Blocks. This gives every completed feature a local handler bundle that its parent can collect.

In stable Foldkit, a Command can own the Effect that executes each invocation:

::Snippet{name="previewMigrationStableCommandBefore" label="Stable Before: Command execution"}

In the preview, define the Command through its owning Definition. Put a generator under `handler`; Foldkit applies `Effect.gen` to that constructor. Obtain application-lifetime Services in the generator and return the function that handles each invocation. The Settings example shows a Definition-owned Command, its handler constructor, and the resulting `.layer`:

::Snippet{name="blockDefinition" label="Candidate: Definition-owned Command handler"}

The handler constructor runs once when the Runtime builds the application Layer. The returned function runs once per Command invocation with fresh arguments. Keep changing data such as Command args, Subscription dependencies, mounted elements, and ManagedResource handles in that returned function or lifecycle object.

Apply the same ownership to every effect primitive:

| Stable shape                                        | Candidate shape                                                                                                                                          |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Command.define(..., { execute })`                  | `FeatureDefinition.makeCommand(..., { handler: function* () { return args => Effect } })`                                                                |
| `Subscription.make` with `dependenciesToStream`     | `FeatureDefinition.makeSubscriptions`, a stable handler name, declared `messages`, `modelToDependencies`, and a handler that returns the Stream function |
| `Subscription.persistentEntry(stream)`              | A named Definition-owned entry whose handler returns a zero-argument Stream function                                                                     |
| `Mount.define(..., { execute })`                    | `FeatureDefinition.makeMount(..., { handler })`; register the Mount in the Composition                                                                   |
| ManagedResource with inline `acquire` and `release` | `FeatureDefinition.makeManagedResources`; the handler returns both `acquire` and `release`                                                               |

`makeSubscriptions` entries take a dependency Schema field record, in the same shape passed to `Schema.Struct`. If an adapter already supplies a Struct as `dependenciesSchema`, pass `dependenciesSchema.fields` to `entry`.

Every attached handler exposes a `.layer`. Merge only the definitions owned by that feature into its local `EffectsLayer`, then pass that bundle to `prepareBlock`. Registered child Bindings contribute their own handler graphs automatically.

::Snippet{name="applicationFeatureLayer" label="Feature handler Layer composition"}

Keep ordinary Effect Service providers separate. `ApplicationLayer` supplies HTTP, storage, RPC, clock, browser, and other application Services below the completed handler graph:

::Snippet{name="applicationRootLayer" label="Application Service providers"}

Omit `handler` only when an external host intentionally owns that implementation. Build the host alternative through the original definition's `toLayer` so it retains source identity, and complete or replace the Block's handler graph through its public handler APIs. Do not recreate a same-shaped definition.

## 2. Complete Every Feature as a Block

A stable Submodel exports its contracts and behavior as separate module values. Wrap those values in the candidate's Definition, Composition, and completion stages in one pass:

| Stable                                                           | Candidate                                                |
| ---------------------------------------------------------------- | -------------------------------------------------------- |
| Separate Model, Message, optional OutMessage, and init contracts | `Block.makeDefinition('Search', contracts)`              |
| Plain `init` and `update` functions                              | `SearchComposition.makeInit` and `makeUpdate`            |
| `Submodel.defineView` and `h.submodel`                           | `SearchComposition.makeView` and a Binding's `embedView` |
| Loose child exports imported by every parent integration point   | One completed `SearchBlock` consumed by parent Bindings  |

A graphless feature still has a Composition. This compact example shows the complete sequence without adding files solely to mirror the stages:

::Snippet{name="organizationGraphlessBlock" label="Compact completed Block"}

Name a Definition `SearchDefinition`, its Composition `SearchComposition`, and its completed value `SearchBlock`. Keep the runtime ID `Search`. Export the completed Block from the feature barrel; parents should not assemble the feature from loose Model, Message, update, and view exports.

When a named Definition is used only to call `makeComposition`, chain the two calls at module scope. Retain the named Definition when Commands, Mounts, ManagedResources, Subscriptions, Steps, OutMessage folds, or Bindings use its authoring methods.

Pass local implementation fields to completion:

- `init`, `update`, and `view` when the Block owns them.
- `subscriptions`, `managedResources`, and local `EffectsLayer` when the feature declares them.
- `operations` for parent-initiated transitions that enter this Block's update.
- Explicit host handler contracts only for definitions whose implementation is deliberately delegated.

The completed Settings Block shows these pieces together:

::Snippet{name="blockSettings" label="Completed Block with an operation and handler Layer"}

## 3. Replace Manual Child Routing with Bindings

Stable parent wiring repeats a child's Message contract and routes it through an authored wrapper:

::Snippet{name="previewMigrationStableChildBefore" label="Stable Before: authored child Message routing"}

In the candidate API, the child's local `Message` union contains only facts owned by that child. The parent creates a Binding from the completed child Block and registers it under `bindings`:

::Snippet{name="organizationChildComposition" label="Candidate: Binding registration"}

Make these changes together:

1. Delete the parent's authored `GotSettingsMessage` variant.
2. Complete Settings as `SettingsBlock`, including its init, update, primary view, OutMessage, lifecycle declarations, and local handlers.
3. Replace the `Update.foldChild` configuration with `ParentDefinition.makeBinding(SettingsBlock, ...)`. Move its Model access, delivery context, presence, key, and OutMessage policy into the Binding.
4. Register that Binding with `ParentDefinition.makeComposition({ bindings: [SettingsBinding] })`.
5. Delete `toParentMessage` and the local update branch that unpacks the child Message. Author the parent update with `ParentComposition.makeUpdate`; it matches only the parent's local Message union.

Composition derives a private delivery envelope for each registered placement and routes it before the local update callback. Use `ParentComposition.Message` while authoring against the graph, and `ParentBlock.Message` after completion, whenever serialization, replay, DevTools, routing, or crash reporting needs the complete Message Codec. Do not construct generated `Got<Placement>Message` envelopes yourself.

Use `delivery.when` to accept child delivery conditionally and `delivery.toUpdateContext` when the child's update needs parent-supplied dispatch context. Those fields control delivery. They do not recreate an authored wrapper.

### Author Local Update Handlers

Use `FeatureComposition.makeUpdate({ Tag: (model, message) => result })` for an exhaustive record of locally authored facts. Composition routes generated child delivery separately. Each handler retains its own inferred Command requirements and OutMessages, so an operation selecting a silent handler does not acquire another handler's possible OutMessage. Use `makeUpdate.withContext(context => handlers)` when dispatch supplies additional arguments.

::Snippet{name="counterUpdate" label="Authoring exhaustive local Message handlers"}

Normal handlers may return result objects directly. In a handler that mixes local results with connected Binding recipes, use Definition-owned Steps for the local branches. The [Update guide](/core/update#preserving-local-results-beside-connected-operations) explains the enforced boundary and shows a repair. Do not annotate away registration or result-channel requirements.

### Select the Binding Shape

Prefer the narrowest Binding that represents the parent's actual storage:

- Use `field` for a required child Model or `Option<ChildModel>` stored directly on the parent.
- Add `key` for a direct array or keyed wrapper whose stable identity field is a string or finite number.
- Add `childField` when the collection item wraps the child Model with parent-owned data.
- Use explicit accessors for a custom relationship that the field forms cannot represent.
- Use `presentWhen` only when the whole child occurrence, including its lifecycle, is conditionally present. Use a Subscription gate when only one Subscription should stop.

The direct collection form keeps each child occurrence's identity in the parent Model:

::Snippet{name="blockDirectCollection" label="Direct keyed child collection"}

Never key repeated occurrences by array position. Generated delivery records the placement, stable key, and occurrence generation so a result from a removed child cannot reach its replacement.

### Fold OutMessages in the Parent

A child OutMessage reports a fact across the boundary. The parent owns the response. Pass the completed child explicitly whether a fold is inline or named: `makeBinding(ChildBlock, ...).withOutMessagePolicy({ fold: ParentDefinition.makeOutMessageFold(ChildBlock, handlers) })`.

::Snippet{name="blockOutMessagePolicy" label="Parent-owned child OutMessage policy"}

Name every child OutMessage variant. The helper infers the payloads, parent contracts, Command requirements, and sibling graph. Pass `WholeChildBlock` explicitly when extracting the callable fold, adapting keyed policy, or staging self-referential or reciprocal composition. Use the inferred `FoldContext` only when a branch needs `liftCommand` or `modelBeforeUpdate`. Missing or extra variants, undeclared parent OutMessages, missing policy selection, and unregistered sibling operations fail type checking.

Use `ParentDefinition.makeOutMessageForward(handlers)` inline under an unkeyed Binding's `withOutMessagePolicy({ forward })` when the current Block deliberately exposes a named child fact as one of its own OutMessages. Pass `WholeChildBlock` explicitly when extracting the callable forward or adapting keyed policy. The helper is available only when the parent Definition declares an OutMessage Schema. Each named handler returns a declared parent OutMessage or `undefined`, and at least one variant must forward. Omit forwarding when every variant stops here. An application root cannot leave an OutMessage for the host to discard; fold or stop every child OutMessage before completing `ApplicationBlock`.

Keep a one-way policy as an ordinary fluent declaration. For a self-referential or reciprocal policy, first name `FooBinding`, author the fold against that operation-bearing value, then select `FooBindingWithOutMessagePolicy` and register the selected value. Policy selection keeps the same child Binding identity and lifecycle scopes. Definition, Binding, policy, and Composition construction remain passive.

### Replace Parent Model Rewrites with Operations

A parent-initiated child transition must still pass through the child's update. Put a local Message constructor or an exact Message tuple producer under the child completion's `operations`. The Binding projects each operation into a parent Step.

The completed Settings Block exposes `requestThemeChange`. In a `makeUpdate` branch, the parent creates the connected Step and immediately applies it to the contextual `model`:

::Snippet{name="blockDelegateViaHelper" label="Calling a bound Block operation"}

An operation retains the child update's full context tuple, even when the Message branch it selects does not use every context value. Pass those context arguments when calling the completed Block or bound operation. `delivery.toUpdateContext` supplies context for incoming child Message delivery; it does not supply arguments to an ordinary operation call.

Rename existing `Update.combine` calls to `Update.combineSteps`. Both data-first and data-last calls retain the same arguments and inference.

When several Steps must run in order, pass the unapplied Binding operations alongside the parent Steps to `Update.combineSteps`. A Definition-owned `makeStep` may return the connected Step for later use under that Composition, and Composition startup may list it under `steps`. Do not return an unapplied Binding operation from an ordinary update branch that must produce an update result.

Author parent transitions that read current state with `Definition.makeStep` or `makeFieldsStep`, then combine them with the Binding operations. The owner supplies the Model type, and each Step reads the Model produced by preceding Steps when it is applied.

Use `request*` with `Requested*` Messages for actions and `inform*` with `InformedOf*` Messages for notifications. Keep internal Model-only transformations as Definition-owned Steps. Remove stable public helpers that silently accept and return a child Model, especially `reflect*` helpers.

### Move Child Initialization into the Composition Plan

The Binding owns how one child occurrence starts. The Composition's `makeInit` callback supplies parent-owned fields, shared child init context when required, and ordered startup Steps. Foldkit assembles the child Models and lifts their init Commands.

Choose the init form from the relationship:

- Omit `init` for an argument-free required direct field.
- Use `init.contextToArgs` when a required or automatically present child receives values from `ChildInitContext`.
- Use `init: false` when the parent constructs a required child through a deliberate dynamic path.
- Use `init.instances` for the exact initial members of a keyed collection.
- Use `Binding.init` for dynamic insertion, custom storage, or an Option-wrapped keyed occurrence.

Return `childInitContext` from `makeInit` when a registered selector uses it. List startup transitions under `steps`; each Step receives the Model produced by the previous Step. Do not call an old `boot` helper or discard a child init result's Commands.

::Snippet{name="blockFoldChildInit" label="Composition-owned child initialization"}

### Author Views Against the Registered Graph

Create the primary view through `FeatureComposition.makeView` or `makeView.withInputs`. Embed a child with `h.block(Binding.embedView(...))`. The builder permits only Bindings and Mounts registered by that Composition, so a missing registration becomes a local type error.

When a helper needs the same graph capabilities, derive its builder type from the Composition:

::Snippet{name="featureViewHelpers" label="Composition-derived view helpers"}

Use `Block.ViewBuilderFor<typeof FeatureComposition>` for owner-specific helpers. Use the general `HtmlBuilder` only for a helper that truly has no owner-specific child or Mount capability. Do not widen the builder, Binding list, Mount list, or child attribute requirements to `any` to silence a graph error.

## 4. Build the Root Block and Host Program

Stable `Runtime.makeApplication` combines the application state machine, lifecycle declarations, browser container, and startup configuration:

::Snippet{name="previewMigrationStableRootBefore" label="Stable Before: application and browser host"}

Make the root an ordinary completed Block named `Application`:

1. Replace the loose root contracts passed to `Runtime.makeApplication` with `Block.makeDefinition('Application', { Model, Message })`.
2. Rename a root route union named `AppRoute` to `ApplicationRoute`, including its imports and type queries.
3. Build `ApplicationComposition` through `makeComposition({ bindings, mounts })` as needed.
4. Author root init, update, and view through that Composition.
5. Return `ApplicationComposition.prepareBlock(...)` from the private `prepare` producer, then complete `ApplicationBlock` with `Block.assemble(prepare)`.
6. Move container, Flags, routing, Ports, DevTools, and other browser host fields into `Program.make`.
7. Supply ordinary application Services with `program.provide(ApplicationLayer)` before starting the Runtime.

The browser entry should now be small and host-focused:

::Snippet{name="applicationEntryPoint" label="Candidate: browser Program"}

The candidate entry opts into external MCP Message discovery and dispatch with `devTools: { dispatch: true }`. Program derives the dispatch Codec from `ApplicationBlock`, including generated child envelopes. Omit `devTools` to keep development inspection with dispatch disabled, or pass `devTools: false` to disable the DevTools store, overlay, and browser bridge.

Preserve the host mode:

| Host                     | Candidate entry                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Browser page             | `Program.make({ block: ApplicationBlock, ...hostConfig })`, then `Runtime.run` or `Runtime.hydrate`                                              |
| Container-scoped element | `Program.makeElement({ block: ApplicationBlock, ...hostConfig })`, then `Runtime.run` or `Runtime.embed`                                         |
| SSR or SSG               | `Server.renderToString(ApplicationBlock, serverConfig, requestOptions)`; the browser hydrates a `Program.make` Program built from the same Block |

::Snippet{name="runToElement" label="Container-scoped Program"}

::Snippet{name="blockServerRender" label="Server rendering the completed root Block"}

`Program.makeElement` and `Runtime.embed` do not hydrate. Keep the existing server Flags handoff and build-id policy when migrating an SSR or SSG application; the [Server Rendering guide](/core/server-rendering) describes that host contract.

## 5. Preserve a Clear File Direction

A compact feature can keep contracts, Composition, implementation, and completion in one module. A compact application can keep those values in `application.ts` and put only host startup in `entry.ts`.

Split a growing feature by ownership:

| File                                                              | Owns                                                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `definition.ts`                                                   | A named Definition and early contracts when authoring methods need it                         |
| `command.ts`, `subscription.ts`, `mount.ts`, `managedResource.ts` | Local effect and lifecycle declarations                                                       |
| `composition.ts` or `composition/`                                | Bindings, OutMessage policy, Mount registration, Composition, and optional view builder alias |
| `init.ts`, `update.ts`, `view.ts`                                 | Behavior authored through that Composition                                                    |
| `block.ts`                                                        | `prepareBlock` and the local `EffectsLayer` selection                                         |
| `services.ts`                                                     | Root `ApplicationLayer` and test providers for ordinary Services                              |
| `entry.ts`                                                        | Program host configuration and Runtime startup                                                |

Keep imports moving in that direction. Composition may import completed children and local policy declarations. It must not import its own init, update, view, completed Block, or feature barrel. Implementation modules may import the Definition, Composition, and Bindings. `block.ts` may import every implementation field to complete the feature.

Use `index.ts` only as an explicit barrel. Export `SettingsBlock`, not every private effect registry and policy helper. Internal modules import real owning files instead of importing their own barrel.

If TypeScript reports a recursive initializer or a value is undefined during module evaluation, inspect the Binding stages and import graph. Name the ordinary Bindings before authoring self-referential or reciprocal folds, then select and register `<Child>BindingWithOutMessagePolicy`. Common import causes are `composition.ts` importing `block.ts`, a child importing its parent's barrel, or an extracted policy importing the completed parent. Keep reciprocal sibling policies in the same parent composition module, and move a shared pure Step into a leaf module when both sides need it. Do not add annotations, casts, generic argument lists, or raw child matchers to break the cycle.

The [Project Organization guide](/patterns/project-organization) shows compact, split, graphless, Mount-only, and policy-heavy layouts.

## 6. Migrate Tests, Lint, and Dependencies

Run typecheck after each completed leaf or parent. The candidate types carry graph identity, handler requirements, generated delivery, update context, and OutMessages together; postponing typecheck makes the first error harder to locate.

Keep Story and Scene at the same behavioral boundary:

- A child Story still sends the child's local Messages to its authored update.
- A parent Story or Scene resolves a child Command with the raw child result Message. The pending Command retains the generated delivery path.
- Match Commands and Mounts by the original Definition's source identity, not by placement-qualified display strings.
- Build Scene Subscription declarations from `Scene.subscriptions(ApplicationComposition, localSubscriptions?)` instead of manually wrapping child emissions.
- Test a completed UI Block through its public Model, Message, OutMessage, operations, and test Definitions.

If a parent Story constructed a `Got*` wrapper to simulate a child UI event, move that interaction to a parent Scene. Click the rendered control, then resolve or assert the resulting Commands. Keep child-local facts in a child Story. Do not add a production operation solely for a test or fabricate a generated envelope; parent-driven operations remain appropriate when the production parent actually initiates the transition.

The testing migration examples show the before and after forms for Command resolution, Subscription emission, and completed UI components:

::Snippet{name="testingMigrationCommandAfter" label="Command resolution through source identity"}

::Snippet{name="testingMigrationSubscriptionAfter" label="Scene Subscription registry"}

::Snippet{name="testingMigrationUiAfter" label="Completed UI Block test fixture"}

For a generic UI factory, the concrete completed Block owns the result Message Codec, while the component's `test` namespace owns the original Command and Mount Definitions. In an existing Scene with those effects pending, resolve them through those two owners:

::Snippet{name="previewMigrationFactoryUiTest" label="Resolving a factory Menu's effects"}

Enable the current Foldkit Oxlint preset before treating the migration as finished. Its Block rules catch manual child routing, direct child Model updates, child Message construction in a parent, empty OutMessage forwarding, unstable component factories, and naming mismatches. Fix the reported ownership problem; do not disable the rule around migrated code.

After typecheck and lint pass, run the application's full Story, Scene, unit, integration, browser, SSR or SSG, and production build checks that were green in the baseline. Verify the lockfile contains only the exact preview snapshot from the deployment manifest and the exact compatible Effect peers.

### Linked Packages and Duplicate Foldkit Copies

A linked adapter or component library can accidentally load a second Foldkit copy even when its source imports look correct. The resulting errors often involve same-shaped Definitions, Bindings, Messages, or Layers that fail identity or type checks.

Declare `foldkit` and every relevant `@foldkit/*` package as peer dependencies of the linked library. Put the same exact preview versions in that library's development dependencies for its own build and tests. The consuming application must also declare those exact preview versions directly. Do not ship a separate Foldkit copy as a regular dependency of the linked library.

Run `pnpm why foldkit` and `pnpm why @foldkit/ui` from the consuming application, adjusting the second command for each Foldkit package in use. Confirm that the linked library and application resolve one installed snapshot. Then verify that the application's `@foldkit/vite-plugin` build resolves both through one Foldkit module graph. Add narrowly scoped Vite `resolve.dedupe` entries or a `resolve.noExternal` entry only when graph inspection shows that a linked package is otherwise resolved or externalized separately.

Preserve the original runtime definitions and their module identity. Type casts, recreated same-shaped definitions, and parallel aliases can silence or move a compiler error, but they do not repair a duplicate Foldkit graph.

## Required Changes and Optional Cleanup

Finish the required column before broadening the migration.

| Required for the candidate API                                              | Optional after behavior is green                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Pin one exact manifest snapshot.                                            | Split a compact feature that remains easy to navigate.                                |
| Move effect implementations into Definition-owned handler Layers.           | Rename unrelated domain helpers for consistency.                                      |
| Complete every consumed feature as a named Block.                           | Extract a local `EffectsLayer` from `block.ts` when it becomes substantial or reused. |
| Register parent-owned Bindings and remove authored child delivery wrappers. | Extract a substantial one-way Binding policy into `composition/`.                     |
| Replace parent rewrites of a child Model with Message-backed operations.    | Add more focused Story or Scene coverage beyond the migration baseline.               |
| Move child startup into Binding and Composition init policy.                | Reorganize domain modules that do not participate in Block assembly.                  |
| Create `ApplicationBlock` and move host fields to Program.                  | Adopt additional APIs unrelated to Layers, Blocks, or Program.                        |
| Update affected tests and satisfy current lint rules.                       | Perform stylistic rewrites that do not resolve an API or ownership error.             |

Avoid mixing optional cleanup into the first compiling pass. A smaller diff makes it easier to prove that the migration preserved behavior.

## Compiler Error Guide

Treat the first error in an ownership chain as the useful one.

| Error or symptom                                                           | What to inspect                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Got*Message` is missing, or a local Message match is no longer exhaustive | Remove the authored wrapper and its update branch. Register the Binding and use the Composition or completed Block Message Codec where the complete graph is required.                                                                                        |
| A stable `Update.foldChild` configuration no longer fits the child         | Complete the child, create a parent-owned Binding, move OutMessage and access policy into it, and register it under `bindings`.                                                                                                                               |
| `execute`, `dependenciesToStream`, or inline lifecycle work is rejected    | Move the implementation into a Definition-owned handler constructor and include its `.layer` in the feature's local `EffectsLayer`.                                                                                                                           |
| `Submodel.defineView` or `h.submodel` is missing                           | Author the view through the owning Composition and render the child through `h.block(Binding.embedView(...))`.                                                                                                                                                |
| `Runtime.makeApplication` or `Runtime.makeElement` is missing              | Complete `ApplicationBlock`, then create the matching page or element Program separately.                                                                                                                                                                     |
| A view cannot embed a child or use a Mount                                 | Register the exact Binding or Mount in the same Composition that authored the view. Derive helper builders from that Composition.                                                                                                                             |
| A Binding operation is a Step where an update result is required           | Apply it to the contextual Model, such as `Binding.requestOpen()(model)`. Pass the unapplied Step only to `Update.combineSteps`, a Definition-owned `makeStep`, or Composition startup.                                                                       |
| An OutMessage-producing Step fails an `Update.combineSteps` overload       | `combineSteps` has no OutMessage channel. Combine the plain Steps, then attach the known OutMessage to their result with `Update.withOutMessage`. See [Step authoring](/core/block).                                                                          |
| The parent update loses Commands or an OutMessage                          | Return the executed result after applying the Binding operation to the contextual Model. Do not select or copy only `.model`; that discards the other channels.                                                                                               |
| Child initialization leaves a field missing or loses Commands              | Put startup args and instances on the Binding. Let `makeInit` assemble children, and use `Binding.init` for dynamic occurrences.                                                                                                                              |
| `Runtime.run` still requires a handler                                     | Include the owning definition's `.layer` in the feature's local `EffectsLayer`, or explicitly complete an intentional host handler contract.                                                                                                                  |
| A handler Layer still requires an application Service                      | Supply that Service below the completed Program through `ApplicationLayer`; do not move Service lookup into update.                                                                                                                                           |
| A Layer has the right shape but fails identity checks                      | Build it from the original definition's `toLayer`. Same names and protocols do not make separately created definitions identical.                                                                                                                             |
| A linked package reports incompatible same-shaped Foldkit types            | Use `pnpm why` to find duplicate copies, align the library's peers and development dependencies with the app's exact preview versions, and verify the Vite module graph.                                                                                      |
| `ApplicationBlock` cannot complete because of an OutMessage                | Fold or stop every root child OutMessage. A browser host is not an OutMessage parent.                                                                                                                                                                         |
| TypeScript reports recursive initializers or runtime imports are undefined | Split self-referential or reciprocal policy selection into `FooBinding` and `FooBindingWithOutMessagePolicy`, restore the Definition → policy → Composition → implementation → Block import direction, and avoid importing a feature's own barrel internally. |

Do not fix these errors with `as`, `unknown as`, `any`, a widened `ReadonlyArray`, or a generic `Layer.Layer<any>`. Those casts erase the evidence that the new API is checking: source identity, exact handler protocols, graph registration, generated delivery, and OutMessage policy. Fix the Definition, Binding, Composition, completion, or provider that owns the mismatch.

## Completion Checklist

The migration is complete when all of these statements are true:

- The installed Foldkit packages match one deployment's `/preview-release.json` exactly.
- Every feature consumed by a parent exports a completed, named `FooBlock`.
- Every init, update, and primary view is authored by the Composition that owns its graph.
- Every child relationship is a registered parent-owned Binding.
- Local Message unions contain no authored child delivery envelopes.
- Parents invoke child transitions through Binding operations and handle child facts through OutMessage policy.
- Every effect and lifecycle implementation is present in the completed handler graph, and every remaining ordinary Service is supplied by `ApplicationLayer`.
- The root is `ApplicationBlock`; browser hosting is a Program; SSR uses the same completed root Block.
- Typecheck, lint, Story, Scene, integration, browser, server-rendering, and production build checks pass to the extent they belong to the application.
- No broad cast or disabled lint rule hides a graph, Layer, Message, or OutMessage error.

After that baseline is green, use [Blocks](/core/block), [Layers](/core/layers), [Project Organization](/patterns/project-organization), and [Testing](/testing) as the canonical references for ongoing work.
