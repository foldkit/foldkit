# Project Organization

## Overview

Organize a Foldkit application around ownership. A feature owns its state machine and local effects. Its parent owns the policy that connects it to siblings and the application. The browser entry owns completion, Service provision, and Runtime startup.

Keep three boundaries visible as the application grows:

| Boundary    | Typical home                                      | Responsibility                                                                    |
| ----------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| Definition  | `definition.ts`                                   | Early Model, Message, OutMessage, Startup, Command, lifecycle, and Step contracts |
| Composition | `composition.ts` or `composition/`                | Parent-owned Bindings, Mount registrations, and graph-aware authoring             |
| Completion  | `block.ts` for a feature, `entry.ts` for the root | Packages implementation; the entry also supplies Services and starts Runtime      |

`bindChild` configures one parent-child relationship. Including that Binding in `makeComposition({ childBindings })` registers it. Both calls are passive; `makeBlock` and `makeApplication` completion are passive too. A browser Runtime builds Layers, calls init, and starts effects after the entry starts it.

## Starting Simple

Start with one cohesive module. The smallest application keeps Model, Message, Composition-owned init, update, view, `Application`, and `ApplicationComposition` together in `application.ts`. A separate `entry.ts` chooses the browser container and startup inputs, completes the Application, supplies shared Services, and starts the Runtime. Tests and server tooling can import the passive application pieces without starting a browser Runtime.

Split when those responsibilities become easier to navigate separately. Once one root responsibility moves out of `application.ts`, move the rest to files named for what they own. `definition.ts` exports the early `Application` contract. `composition.ts` owns Bindings, OutMessage folds, complete child and Mount registration, `ApplicationComposition`, and an optional `ApplicationViewBuilder`. `init.ts`, `update.ts`, and `view.ts` own behavior authored through that Composition. Even a graphless split root has a `composition.ts` so every root follows the same Definition → Composition → completion sequence.

Use `composition/composition.ts` and an explicit `composition/index.ts` barrel only when substantial Binding policies need their own modules. Remove the emptied `application.ts` instead of retaining it as a forwarding barrel.

Add `story.test.ts` and `scene.test.ts` beside the behavior they test. The [Counter example](/example-apps/counter) shows a compact root.

A compact feature with no children or Mounts can stay in one file. Name its empty Composition before authoring the primary view, then complete that same value. A split graphless feature exports the named Composition beside its Definition in `definition.ts`, so `view.ts` and `block.ts` can import it without adding an empty `composition.ts`:

::Snippet{name="organizationGraphlessBlock" label="Small graphless feature"}

## File Layout

Split a module when separate responsibilities make it easier to navigate. The following structure shows optional homes for those responsibilities; do not create empty files to match it.

::Snippet{name="fileLayout" label="Application and feature file structure"}

Use standard structural names within each feature: `Model`, `Message`, `OutMessage`, `Flags`, `init`, `update`, `view`, `subscriptions`, `managedResources`, `mounts`, and `EffectsLayer`. The feature namespace supplies context in parent code, such as `Home.Model` and `Home.Message`. Domain Schemas and individual effects retain descriptive names such as `Person`, `FetchPeople`, and `FocusSearchInput`.

### Early Contracts and Local Effects

Keep `definition.ts` focused on the early typed Definition and its Model, Message, and OutMessage contracts. For a split graphless feature, export its named empty Composition there too. Split implementation files import those authoring values without loading the completed feature. A compact feature need not extract them.

Commands belong to the feature whose update returns them. Keep small definitions beside update; extract `command.ts` when several definitions or substantial handlers make a separate file useful. Extract `message.ts` when handlers need result constructors and importing the update would create a cycle.

Put shared local Mount definitions in `mount.ts`. Both Composition and view import them from that module. Defining a Mount inside `view.ts` would make Composition import the view that already imports Composition.

### A Feature with a Child

For a split feature, `composition.ts` owns its child Bindings, complete child and Mount registration lists, and single `FeatureComposition` value. A new straightforward Binding goes immediately beside that `makeComposition` call. For example, `dashboard/composition.ts` connects a Counter:

::Snippet{name="organizationChildComposition" label="Child Binding and registration"}

An update can import `CounterBinding` to invoke its exposed operations. Registered wrapper Messages route through the Binding automatically. The view imports `DashboardComposition`. Including `CounterBinding` under `childBindings` also includes the completed child's handler graph and lifecycle declarations.

`block.ts` imports the Composition, init, update, view, and local `EffectsLayer`, then calls `DashboardComposition.makeBlock`. Its explicit `index.ts` exports `block`, public contracts, and intentional domain helpers. Internal implementation files do not import their own completed barrel.

### A Feature with Mounts Only

A split Mount-only feature also uses `composition.ts`. The Composition assembles capabilities whether or not it has children. For example, `panel/composition.ts` registers the Mount from `panel/mount.ts`:

::Snippet{name="organizationMountComposition" label="Mount-only Composition"}

The view imports both the Composition and the local Mount definition:

::Snippet{name="organizationMountView" label="View using its registered Mount"}

Registration grants the view permission to use the Mount. Completion supplies its handler recipe through the local `EffectsLayer`:

::Snippet{name="organizationMountBlock" label="Mount handler at Block completion"}

### Substantial Binding Policy

A Binding also contains the parent's integration policy for its child. Extract a supporting file when that policy includes substantial OutMessage handling, custom Model writes, or Command lifting. For example, an Editor's Dialog policy may save the draft when the Dialog closes:

::Snippet{name="organizationDialogPolicy" label="Extracted Dialog integration policy"}

Put that policy in `editor/composition/dialog.ts`. The single assembly point becomes `editor/composition/composition.ts`, with an explicit `composition/index.ts` barrel. Straightforward Bindings remain in the assembly file alongside the complete registrations:

::Snippet{name="organizationPolicyComposition" label="Feature assembly with an extracted policy"}

The directory barrel exports the intended assembly surface explicitly:

::Snippet{name="organizationCompositionBarrel" label="Explicit Composition barrel"}

Do not create arbitrary groups such as pages or controls, a second `childBindings` list, or a global list of Bindings. The root follows the same directory layout: `composition/composition.ts` owns graph assembly and `composition/index.ts` exports its intended surface. The assembly imports extracted policies directly from their sibling modules, and the barrel re-exports actual values such as `HomeBinding`, `RoomBinding`, and `ApplicationComposition`. External consumers import from `composition.ts` or that explicit barrel, never from a policy or assembly implementation path. Use a factory only when constructing the Binding requires caller-owned configuration. Do not add a namespace or factory merely to group one policy file.

A substantial one-way policy may live in its own file. Keep reciprocal policies in the same parent assembly module so each side can refer to the other Binding. Put the reciprocal call behind a policy callback that runs when Foldkit applies the fold; the callback may close over a sibling Binding declared later in the module. This keeps the coordination in one parent-owned graph without introducing circular imports.

### Views, Behavior, and Import Direction

Author the primary view through `FeatureComposition.makeView` or `makeView.withInputs`, leaving its `h` parameter inferred. When local helpers need its builder type, declare `type FeatureViewBuilder = Block.ViewBuilderFor<typeof FeatureComposition>` immediately after the Composition with no blank line. Export the alias only when another file uses it. Ordinary view helpers receive that builder and the Model, domain value, or context they use. The alias retains Message, child, and Mount capabilities without constructing anything at runtime.

The owner prefix distinguishes a builder derived from one Composition at a plain type import site. `Model`, `Message`, and `OutMessage` keep their standard architecture names because they normally travel through a feature namespace such as `Search.Model` or `Search.Message`. Helpers shared across features use the general `HtmlBuilder` type instead of an owner-specific alias.

Keep substantial behavior in `init.ts`, `update.ts`, or a folder-named implementation file such as `workHistory/workHistory.ts`. Extracted init and update modules import the named Composition and author their functions through `FeatureComposition.makeInit` and `FeatureComposition.makeUpdate`. Keep child startup ownership beside each Binding: omit `init` for automatic argument-free required direct fields, and use the explicit forms for required inputs, parent-owned required fields, optional presence, and keyed occurrences. The init plan supplies parent-owned fields, decoded `startup` when a selector uses it, and ordered Steps; the Composition assembles child fields and Commands. Keep custom storage and deliberate Command ordering explicit. Init and update never import the completed feature. Composition must not import them in return. A substantial `update/` directory uses `index.ts` as its explicit barrel and `update.ts` as the parent-owned Message matcher. The same rule gives a view directory `view/index.ts` and `view/view.ts`.

Dependencies point from contracts to local declarations and policies, then to Composition, view, and completed Block. An update or view can import a Binding from Composition. Composition must not import the update matcher, primary view, or completed Block in return. If one child policy needs a parent Step, define the policy beside the Binding or extract the pure operation into a leaf module that does not depend on Composition. A helper that returns a connected sibling operation uses the parent's `step` producer so it preserves the Binding requirement and defers application; it does not invoke that operation against a plain Model parameter. Keep reciprocal sibling policies together in the parent assembly and defer each sibling call through its policy callback. A one-way policy may remain in its own file.

Keep substantial URL-change handling in `update/changedUrl.ts`. Prepare the next Route and URL, then compose the child Steps and return the required Commands in a visible order. Keep each Route identity comparison beside the behavior it controls. Put reusable Route selectors in `route.ts` and sidebar selection with the navigation-display helpers. Composition declares child startup; the URL handler decides how child state changes during navigation.

## Root Application Assembly

In a split root, `composition.ts` owns the complete child and Mount graph and `ApplicationComposition`. Put straightforward root Bindings and their OutMessage folds directly beside its `Application.makeComposition` call. Extract substantial policies to files such as `composition/home.ts`; then `composition/composition.ts` owns assembly, `composition/index.ts` is an explicit barrel, and the assembly module imports those policies directly from sibling modules. Composition depends on `definition.ts`, completed children, and local policy declarations. It never imports root init, update, or view.

::Snippet{name="applicationRegistrations" label="Root child graph"}

`definition.ts` imports the split root's Model and Message Schemas and exports `Application`. Root Commands, Subscriptions, init, update, and composition import that contract directly. A simple root `EffectsLayer` stays with its Command definitions in `command.ts`; extract `layer.ts` only when Layer composition is substantial or reused.

Root `services.ts` composes `ApplicationLayer`. The entry imports it and each completion field from its real owner, chooses browser inputs, and invokes the Runtime:

::Snippet{name="applicationEntryPoint" label="Browser application entry point"}

Keep browser container lookup, routing callbacks, DevTools configuration, and startup Flags visible in `entry.ts`. Tests and server entries import the passive Composition and implementation pieces without starting the browser Runtime. Do not collect unrelated root behavior in `root.ts` or aggregate Subscriptions in a vague `lifecycle.ts`; use `subscription.ts` or `subscription/subscription.ts`.

## Separate Handler Recipes from Application Services {#composing-handler-layers}

Foldkit handlers and ordinary application Services solve different problems. A Command Definition identifies work the Runtime may invoke. `LoadProducts.layer` is the recipe that constructs the handler for that Foldkit Definition. `ProductCatalog` is an ordinary Effect Service the handler uses to do its work.

Keep canonical handlers attached to their Command, Subscription, Mount, and ManagedResource definitions. Compose attached recipes such as `LoadProducts.layer` in the feature's local `EffectsLayer`. Name a standalone `LoadProductsLayer` only when that individual provider is intentionally public or independently reused, and an external alternative `LoadProductsTestLayer`.

Compose a small local bundle in `block.ts`. Extract `layer.ts` when the composition is substantial or independently reused. Pass the local bundle to `FeatureComposition.makeBlock`. A feature can provide business services that it owns while leaving HTTP, storage, RPC, and browser providers open for the root.

::Snippet{name="applicationFeatureLayer" label="Feature handler Layer composition"}

Products supplies `ProductCatalogLayer` beneath its local handlers because that business Service belongs to the feature. The catalog's external HTTP or storage dependencies remain requirements of the root's production or test provider.

Effect represents each required Service in an Effect's requirements type and uses Layers as constructors for Services and their dependencies. Read [Managing Services](https://effect.website/docs/v4/requirements-management/services) before [Managing Layers](https://effect.website/docs/v4/requirements-management/layers) if those Effect concepts are new.

### Local Handlers and the Complete Graph

At a split root, `command.ts` owns the root Command Definitions and exports `EffectsLayer` when those recipes are the complete root-local handler bundle. The entry imports that value directly. When the root combines Command recipes with other local handler bundles and the aggregate is substantial or reused, `layer.ts` owns the final `EffectsLayer` instead. Neither file imports or relists child handlers.

Registered child Blocks contribute their own selected `EffectsLayer` recursively. Completing the Application includes that transitive handler graph automatically. Do not manually import or relist every child Command at root, and do not merge a registered child's handler bundle a second time.

There is no flattened, human-readable list of every Command Layer in an Application today. To inspect the handlers, follow `ApplicationComposition`'s registered children into each completed Block and its local `EffectsLayer`. Keep that graph as the source of truth rather than maintaining a second global list.

### Ordinary Service Providers

Root `services.ts` chooses concrete HTTP, storage, RPC, and browser providers and exports `ApplicationLayer`. These providers satisfy requirements left by Flags and the complete handler graph:

::Snippet{name="applicationRootLayer" label="Root service Layer composition"}

`LocalStorageLayer` and `SessionStorageLayer` implement distinct application Service tags, so both stores coexist. `ApplicationTestLayer` supplies deterministic alternatives beneath the same real handler graph. Adding a feature handler changes its local `EffectsLayer`; changing a provider changes `ApplicationLayer`. Neither requires another provision call in `entry.ts`.

The Runtime builds the selected handler recipes and `ApplicationLayer` once per application start. Each Command invocation then calls the already constructed handler. Subscriptions and ManagedResources follow their active Block occurrence, while Mounts follow mounted elements.

## Composing Runtime Behavior

A feature's `EffectsLayer` supplies handlers. Its Subscriptions, ManagedResources, and Mounts declare the lifecycle work Foldkit manages. The root `Application.makeComposition` call includes the child graphs through their registered Bindings.

The Binding's storage and Message mapping connect child work to the parent. A direct Option field containing `None`, a false `presentWhen`, or a custom reader returning `None` stops that child's lifecycle work. A keyed Binding creates independent scopes for active keys. The same Binding supplies update folding and `embedView`.

Stateful UI components compose in the same way. Include a component Binding in `childBindings` to collect its handlers, lifecycle declarations, and Mount evidence. View-only components need no Binding.

When a parent update needs an explicit requirement union, derive it from the child update and Command-producing helpers. Do not derive update requirements from `Layer.Success<typeof Child.EffectsLayer>`: that bundle may also implement lifecycle handlers the update never requests.

## Where Tests Live

### Test Within the Owning Feature

Colocate tests with the boundary they exercise. A feature's `story.test.ts` drives its update. Its `scene.test.ts` drives its view, using `withViewInputs` when the view requires them.

Test rendering, interactions, Commands, and OutMessages inside the feature that owns them. Test at the parent when the contract involves parent-computed ViewInputs, wrapper routing, a lifted Command, or the parent's response to an OutMessage.

### Test Cross-Feature Flows at the Root

Keep root Scene tests for flows that cross features or pages. Split several root flows by subject, such as `checkout.scene.test.ts` and `cart.scene.test.ts`.

When one folder holds more than one test of a kind, prefix with the subject, like `login.story.test.ts`. Pure modules in `domain/` need neither primitive; they take ordinary Vitest tests beside them.

See the [Testing](/testing) page for the full Story and Scene reference.

When a test starts the full application, compose the production feature Layers with test implementations of their external services before building the application Layer. This runs real Command, Subscription, Mount, and ManagedResource handlers. Replace a whole handler only when the test intentionally supplies its result or lifecycle path; that narrower orchestration test does not cover the replaced handler.

## Domain Modules

Put shared business concepts in `domain/`. Each module owns its Schema and pure operations.

::Snippet{name="domainModule" label="Domain module"}

Import the module as a namespace and call operations such as `Cart.addItem` and `Cart.removeItem`.

## Index Re-exports {#index-reexports}

Use `index.ts` only as a barrel. Re-export intended names explicitly so adding an internal export does not expand the public API. Use `export *` only when the entire module surface is intentionally public. Re-export the completed `block` from the feature's completion file, then export that feature folder as a namespace at the parent barrel. The namespace keeps `block`, Model, Message, OutMessage, and intentional public domain helpers together without hiding where they came from. Keep lifecycle registries and other implementation details out of the barrel. Focused tests can import a private implementation from its owning module without turning test access into a general public contract.

::Snippet{name="indexReexports" label="Index re-exports"}

Consumers import feature and domain modules as namespaces.

::Snippet{name="indexUsage" label="Completed features and domain namespaces"}

`Products.` exposes the feature's public surface without revealing its internal file layout. Parent composition starts from `Products.block`.

### Keep Barrel Dependencies Pointing Inward

A parent barrel may re-export each immediate child namespace, and application code may import those namespaces from the barrel. The exported child modules must not import the application root in return. If `message.ts` imports `Home` from `page/index.ts` while a module re-exported by `page/index.ts` imports that root Message, the barrel closes a circular dependency.

Within a feature, import implementation pieces from their owning modules rather than from the feature's own completed barrel. Early contract modules can import a child's Model or Message directly when loading its completed namespace would close a cycle.

Keep shared leaf modules independent of the root. Pass parent-owned rendering capabilities through function arguments or Block `viewInputs`, and make stateful shared behavior its own Block. The parent then provides the capability at the view boundary while each Page remains importable through the one-level barrel.
