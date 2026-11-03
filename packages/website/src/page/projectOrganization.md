# Project Organization

## Overview

Organize a Foldkit application around ownership. A feature owns its state machine and local effects. The parent owns its child relationships and integration policy. The browser entry owns host configuration, ordinary Service provision, and Runtime startup.

:::tip A complete workspace
The [Workspace example](/example-apps/workspace) applies these conventions to shared issue data, retained editors, keyed Boards, notifications, and a command palette. It includes nested UI Blocks and scoped Story and Scene tests.
:::

| Boundary       | Typical home                           | Responsibility                                                                                                                   |
| -------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Definition     | `definition.ts`                        | Declare the public contracts and author local effects and Steps.                                                                 |
| Composition    | `composition.ts` or `composition/`     | Declare Bindings, OutMessage policy, Mount registration, and graph-aware builders.                                               |
| Implementation | `block.ts` or compact `application.ts` | Acquire child implementations through the constructor and return init, update, view, lifecycle declarations, and local handlers. |
| Host           | `entry.ts`                             | Select the Program, supply Services, and start Runtime.                                                                          |

`makeBinding` declares a relationship against the child's public contract. `makeComposition` registers it. `Definition.makeBlock` checks the effectful constructor without running it. The host later acquires that implementation Layer; init and update remain synchronous pure functions.

## Starting Simple

A compact root keeps the Definition, Composition, init, update, view, and checked `ApplicationBlock` in `application.ts`. A separate `entry.ts` chooses the container and startup inputs, creates the Program, and starts the Runtime.

Once one structural responsibility moves out, use the complete split layout. `definition.ts` declares `ApplicationDefinition`, `composition.ts` registers the graph, and `init.ts`, `update.ts`, and `view.ts` author behavior through its builders. `block.ts` imports those pieces and completes the constructor. Remove the emptied `application.ts`.

A small child can keep its whole implementation in a file named for the feature. A split child uses the same named structural files as the root. Its barrel exports the public contract and implementation `layer`. Put child Block folders under their owner’s `blocks/` directory, with names matching their passive contracts in camelCase. For example, `IssueBoardBlock` lives in `src/blocks/issueBoard/`. A nested child belongs in its own parent’s `blocks/`, such as `issueDetail/blocks/commentComposer/`. Each `blocks/index.ts` explicitly exposes those children.

::Snippet{name="organizationGraphlessBlock" label="Small feature without children"}

Put `story.test.ts` and `scene.test.ts` beside the behavior they drive. The [Counter example](/example-apps/counter) shows a compact root. Use `composition/composition.ts` and an explicit barrel when substantial Binding policies need their own modules.

## File Layout

Split a module when separate responsibilities make it easier to navigate. The following structure shows optional homes for those responsibilities; do not create empty files to match it.

::Snippet{name="fileLayout" label="Application and feature file structure"}

Use standard structural names within each feature: `Model`, `Message`, `OutMessage`, `Flags`, `init`, `update`, `view`, `subscriptions`, `managedResources`, `mounts`, and `EffectsLayer`. The public Block contract supplies context in parent code, such as `HomeBlock.Model` and `HomeBlock.Message`. Declare only local facts in a feature's `Message`; Composition adds child delivery to the acquired executable's complete Message Schema. Domain Schemas and individual effects retain descriptive names such as `Person`, `FetchPeople`, and `FocusSearchInput`.

Declare each Schema's decoded type immediately below it, using the same name and no blank line. Use the short name in explicit annotations, such as `Model`, `Message`, or a domain type. The value name refers to the runtime Schema; the type name refers to its decoded values. Use `typeof Model` when an API needs the Schema type itself.

::Snippet{name="schemaTypeAlias" label="Schema and decoded type"}

Keep local Schema aliases inside the feature's implementation modules. A consumer can name a type derived from the passive child contract, such as `type SearchModel = typeof SearchBlock.Model.Type`, without importing its implementation, and use `SearchModel` in annotations. Feature barrels export the public contract, implementation `layer`, and intentional public domain contracts. Definition callbacks and Composition-owned handlers infer their parameters.

Import the UI exports you use from each public component subpath. Give common names component-qualified aliases, such as `buttonView`, `DialogLayer`, and `makeListboxBlock`. The [Dialog guide](/ui/dialog) shows the imports, Binding, and construction provider together.

### Early Contracts and Local Effects

Keep `definition.ts` focused on `FooDefinition` and its public contracts. Export the Step helpers used by split implementation modules from this file and named-import them where they are used. Keep those helpers out of the feature barrel. A compact feature destructures its helpers beside its Definition; a module with several Definitions can keep qualified calls when the qualifier identifies the owner. Keep the Composition and its ViewBuilder alias in `composition.ts`. Declare the Definition once at module scope, including for a leaf: completion uses `FooDefinition.makeBlock`, and the public export uses `FooDefinition.contract`. Split implementation files import the Definition without loading the completed feature, and import graph-aware authoring values from `composition.ts`.

Commands belong to the feature whose update returns them. Keep small definitions beside update; extract `command.ts` when several definitions or substantial handlers make a separate file useful. Extract `message.ts` when handlers need result constructors and importing the update would create a cycle.

Put shared local Mount definitions in `mount.ts`. Both Composition and view import them from that module. Defining a Mount inside `view.ts` would make Composition import the view that already imports Composition.

Put a resource accessor created by `FeatureDefinition.makeResource` in the feature's `resource.ts`, importing the Definition from `definition.ts`. The lifecycle registry and Commands import that same accessor from `resource.ts`. The accessor module does not import either consumer or create a Composition. See [Managed Resources](/core/managed-resources#defining-the-lifecycle).

### Shared Steps

`update.ts` maps incoming Messages to handlers and Steps. `composition.ts` registers relationships and maps child OutMessages to parent Steps. Put a reusable Step shared by those modules or init in the owning Block's `steps.ts`. Keep a Step used by only one responsibility with that code.

When shared transitions need subdivision, use responsibility files such as `steps/search.ts` and `steps/quoteLoading.ts`, with an explicit `steps/index.ts` barrel. Ownership follows the Model being transformed: a child edits its Model through its own Steps module. Keep Binding registration and child OutMessage policy in composition. Shared Steps import their authoring helpers from the owner's Definition and use operation names without a `make` prefix or `Step` suffix. See [Shared Steps in update](/core/update#shared-steps).

### A Feature with a Child

For a split feature, `composition.ts` owns its child Bindings, complete child and Mount registration lists, and single `FeatureComposition` value. A new straightforward Binding goes immediately beside that `makeComposition` call. For example, `dashboard/composition.ts` connects a Counter:

::Snippet{name="organizationChildComposition" label="Child Binding and registration"}

An update can import `CounterBinding` to invoke its operations. Generated child envelopes route through the Binding automatically. The view imports `DashboardComposition`. Registering `CounterBinding` under `bindings` gives those builders its static contract. Acquiring that Binding in the constructor supplies the child's executable graph, including handlers and lifecycle declarations.

`block.ts` imports the portable builders and child implementation Layers. Its constructor yields `CounterBinding`, then returns that connection under `children` together with init, update, view, and local handlers. The barrel exports `DashboardDefinition.contract` as `DashboardBlock` and the implementation `layer`. Parent Schemas use `DashboardBlock.Model`. Internal implementation modules import their own contracts directly rather than through the completed feature barrel.

### A Feature with Mounts Only

A split Mount-only feature also uses `composition.ts`. The Composition assembles capabilities whether or not it has children. For example, `panel/composition.ts` registers the Mount from `panel/mount.ts`:

::Snippet{name="organizationMountComposition" label="Mount-only Composition"}

The view imports both the Composition and the local Mount definition:

::Snippet{name="organizationMountView" label="View using its registered Mount"}

This Panel Definition declares Model and Message. Its Composition registers the Mount, and its constructor returns `children: []`, the portable builders, and the local `EffectsLayer`:

::Snippet{name="organizationMountBlock" label="Mount handler at Block completion"}

### Substantial Binding Policy

A Binding also contains the parent's integration policy for its child. Inline a short unkeyed policy with `makeBinding(ChildBlock, ...).withOutMessagePolicy({ fold: ParentDefinition.makeOutMessageFold(ChildBlock, handlers) })`. A fold always names its child contract, including when it is inline. Use contextual `makeOutMessageForward(handlers)` when the parent declares OutMessages and forwards at least one variant; pass the child contract explicitly when extracting the forward. Extract a supporting file when the policy includes substantial OutMessage handling, custom Model writes, or Command lifting. For example, an Editor's Dialog policy may save the draft when the Dialog closes:

::Snippet{name="organizationDialogPolicy" label="Extracted Dialog integration policy"}

Put that policy in `editor/composition/dialog.ts`. The single assembly point becomes `editor/composition/composition.ts`, with an explicit `composition/index.ts` barrel. Straightforward Bindings remain in the assembly file alongside the complete registrations:

::Snippet{name="organizationPolicyComposition" label="Feature assembly with an extracted policy"}

The directory barrel exports the intended assembly surface explicitly:

::Snippet{name="organizationCompositionBarrel" label="Explicit Composition barrel"}

Do not create arbitrary groups such as pages or controls, a second `bindings` list, or a global list of Bindings. The root follows the same directory layout: `composition/composition.ts` owns graph assembly and `composition/index.ts` exports its intended surface. The assembly imports extracted policies directly from their sibling modules, and the barrel re-exports actual values such as `HomeBinding`, `RoomBinding`, and `ApplicationComposition`. External consumers import from `composition.ts` or that explicit barrel, never from a policy or assembly implementation path. Use a factory only when constructing the Binding requires caller-owned configuration. Do not add a namespace or factory merely to group one policy file.

A substantial one-way policy may live in its own file and usually keeps the fluent Binding declaration. Keep self-referential and reciprocal policies in the same parent assembly module. Export and register the policy-complete `FooBinding` values. When deferred reciprocal folds need base Bindings, keep those bases internal to the parent composition directory. This keeps the coordination in one parent-owned graph without circular imports or recursive initializer annotations.

### Views, Behavior, and Import Direction

Author the primary view through `FeatureComposition.makeView` or `makeView.withInputs`, leaving its `h` parameter inferred. When local helpers need its builder type, declare `type FeatureViewBuilder = Block.ViewBuilderFor<typeof FeatureComposition>` immediately after the Composition with no blank line. Export the alias only when another file uses it. Ordinary view helpers receive that builder and the Model, domain value, or context they use. The alias retains Message, child, and Mount capabilities without constructing anything at runtime.

The owner prefix distinguishes a builder derived from one Composition at a plain type import site. `Model`, `Message`, and `OutMessage` keep their standard architecture names because the completed value supplies their feature context, such as `SearchBlock.Model` and `SearchBlock.Message`. Helpers shared across features can use a generic `HtmlBuilder` for ordinary content. Forward Mount-bearing child Attributes through a typed caller-owned render callback that retains the actual parent builder. See [Builder ownership](/core/view#builder-ownership) for the shared Dialog example.

Keep substantial behavior in `init.ts`, `update.ts`, or a folder-named implementation file such as `workHistory/workHistory.ts`. Extracted init and update modules import the named Composition and author their functions through `FeatureComposition.makeInit` and `FeatureComposition.makeUpdate`. Use an exhaustive `makeUpdate` record for local Message handlers; it retains each handler's output contract. Use `makeUpdate.withContext` when handlers need dispatch context. The callback overload is removed; [mixed connected results](/core/update#preserving-local-results-beside-connected-operations) need canonical local Step results. Keep child startup ownership beside each Binding. Omit `init` for an argument-free required direct field. Use `init.contextToArgs` for required inputs or automatic unkeyed optional presence, `init: false` for a parent-owned required field, and `init.instances` for an exact keyed array. Use `Binding.init` for an Option-wrapped keyed occurrence, custom storage, or dynamic creation. The init plan supplies parent-owned fields, decoded `childInitContext` when a selector uses it, and ordered Steps; the Composition assembles child fields and Commands. Command collection order does not sequence effects or completion. Init and update never import the completed feature. Composition must not import them in return. A substantial `update/` directory uses `index.ts` as its explicit barrel and `update.ts` as the parent-owned local Message handlers. The same rule gives a view directory `view/index.ts` and `view/view.ts`.

Dependencies point from contracts to local declarations and policies, then to Composition, view, and completed Block. An update or view can import a Binding from Composition. Composition must not import the update implementation, primary view, or completed Block in return. Keep a policy beside its Binding; put a parent Step also used by update or init in the owner's shared Steps module. Pure shared transitions can depend only on the early Definition and domain contracts. When a shared Step and composition depend on one another through a Binding, read that Binding inside a deferred producer so module initialization stays passive. A helper that returns a connected sibling operation uses the parent's `makeStep` producer so it preserves the Binding requirement and defers application; it does not invoke that operation against a plain Model parameter. Keep reciprocal sibling policies together in the parent assembly and defer each sibling call through its policy callback. A one-way policy may remain in its own file.

Name an extracted update-handler file after its exported handler, such as `update/handleChangedUrl.ts` for `handleChangedUrl`. Keep substantial URL-change handling there. Prepare the next Route and URL, then compose the child Steps and return the required Commands in a visible order. Keep each Route identity comparison beside the behavior it controls. Put reusable Route selectors in `route.ts` and sidebar selection with the navigation-display helpers. Composition declares child startup; the URL handler decides how child state changes during navigation.

Name selectors for the values they derive and application Steps for the transitions they describe. Use `init` for initialization functions, helpers, Steps and filenames, such as `initRoom` and `init.ts`. Use `initIssueDetailIfMissing` when a Step preserves an existing editor and initializes an absent identity. Reserve `sync` and `observe` for functions whose responsibility is actual synchronization or observation. A Step returns the next Model and Commands; Runtime performs those Commands later.

Changing Routes need not remove child state. Keep retained editors in parent storage keyed by entity identity when returning to an entity should preserve its state. The Route selects which editor is rendered. Subscription activation and admission of pending results are separate policies. Build a [Route Transition](/core/routing-and-navigation#route-transitions) before replacing the Route when behavior depends on entry, exit, or a change of identity within one Route. Data arriving after navigation still needs its own initialization policy.

## Root Application Assembly

In a split root, `composition.ts` owns the complete static child and Mount graph and `ApplicationComposition`. Put straightforward root Bindings and their OutMessage folds directly beside its `ApplicationDefinition.makeComposition` call. Register the policy-selected Binding when a child declares OutMessages. Extract substantial policies to files such as `composition/home.ts`; then `composition/composition.ts` owns assembly, `composition/index.ts` is an explicit barrel, and the assembly module imports those policies directly from sibling modules. Composition depends on `definition.ts`, child contracts, and local policy declarations. It never imports root init, update, or view.

::Snippet{name="applicationRegistrations" label="Root child graph"}

When root authoring methods need it, `definition.ts` imports the split root's Model and Message Schemas and exports `ApplicationDefinition`. Root Commands, Subscriptions, and composition import that contract directly. Keep the root Definition named even when the Composition has no children; completion uses that same contract. A simple root `EffectsLayer` stays with its Command definitions in `command.ts`; extract `layer.ts` only when Layer composition is substantial or reused.

Root `services.ts` composes `ApplicationLayer`. `block.ts` imports each implementation field from its real owner and assembles `ApplicationBlock`. The entry imports the Block and Layer, chooses browser inputs, creates the Program, and invokes the Runtime:

::Snippet{name="applicationEntryPoint" label="Browser application entry point"}

Keep browser container lookup, routing callbacks, DevTools configuration, and startup Flags visible in `entry.ts`. Tests and server entries import the passive Composition and implementation pieces without starting the browser Runtime. Do not collect unrelated root behavior in `root.ts` or aggregate Subscriptions in a vague `lifecycle.ts`; use `subscription.ts` or `subscription/subscription.ts`.

## Separate Handler Recipes from Application Services {#composing-handler-layers}

Foldkit handlers and ordinary application Services solve different problems. A Command Definition identifies work the Runtime may invoke. `LoadProducts.layer` is the recipe that constructs the handler for that Foldkit Definition. `ProductCatalog` is an ordinary Effect Service the handler uses to do its work.

Keep canonical handlers attached to their Command, Subscription, Mount, and ManagedResource definitions. Compose attached recipes such as `LoadProducts.layer` in the feature's local `EffectsLayer`. Name a standalone `LoadProductsLayer` only when that individual provider is intentionally public or independently reused, and an external alternative `LoadProductsTestLayer`.

Compose a small local handler bundle in `block.ts`. Extract `layer.ts` when that bundle is substantial or reused. Return it as `EffectsLayer` from `FeatureDefinition.makeBlock`. Export the Block implementation separately as `layer`; these Layers have different jobs.

::Snippet{name="applicationFeatureLayer" label="Feature handler Layer composition"}

Products supplies `ProductCatalogLayer` beneath its local handlers because that business Service belongs to the feature. The catalog's external HTTP or storage dependencies remain requirements of the root's production or test provider.

Effect represents each required Service in an Effect's requirements type and uses Layers as constructors for Services and their dependencies. Read [Managing Services](https://effect.website/docs/v4/requirements-management/services) before [Managing Layers](https://effect.website/docs/v4/requirements-management/layers) if those Effect concepts are new.

### Local Handlers and the Complete Graph

At a split root, `command.ts` owns the root Command Definitions and exports `EffectsLayer` when those recipes are the complete root-local handler bundle. The entry imports that value directly. When the root combines Command recipes with other local handler bundles and the aggregate is substantial or reused, `layer.ts` owns the final `EffectsLayer` instead. Neither file imports or relists child handlers.

The constructor acquires child implementations from the supplied Layers. Those implementations contribute their selected handler recipes recursively. The Runtime constructs that complete handler graph after construction. Do not manually import or relist every child Command at root, and do not merge a registered child's handler bundle a second time.

There is no flattened, human-readable list of every Command Layer in an Application today. To inspect the handlers, follow `ApplicationComposition`'s registered children into each completed Block and its local `EffectsLayer`. Keep that graph as the source of truth rather than maintaining a second global list.

### Ordinary Service Providers

Root `services.ts` chooses concrete HTTP, storage, RPC, and browser providers and exports `ApplicationLayer`. These providers satisfy requirements left by Flags and the complete handler graph:

::Snippet{name="applicationRootLayer" label="Root service Layer composition"}

`LocalStorageLayer` and `SessionStorageLayer` implement distinct application Service tags, so both stores coexist. `ApplicationTestLayer` supplies deterministic alternatives beneath the same real handler graph. Adding a feature handler changes its local `EffectsLayer`; changing a provider changes `ApplicationLayer`. Neither requires another provision call in `entry.ts`.

The Runtime builds the selected handler recipes and `ApplicationLayer` once per application start. Each Command invocation then calls the already constructed handler. Subscriptions and ManagedResources follow their active Block occurrence, while Mounts follow mounted elements.

## Composing Runtime Behavior

A feature's `EffectsLayer` supplies handlers. Its Subscriptions, ManagedResources, and Mounts declare the lifecycle work Foldkit manages. The root `ApplicationDefinition.makeComposition` call includes the child graphs through their registered Bindings.

The Binding's storage and generated delivery connect child work to the parent. A direct Option field containing `None`, a false `presentWhen`, or a custom reader returning `None` stops that child's lifecycle work. A keyed Binding creates independent scopes for active keys. The same Binding supplies update folding and `embedView`.

Stateful UI components compose in the same way. Include a component Binding in `bindings` to collect its handlers, lifecycle declarations, and Mount evidence. View-only components need no Binding.

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

Use `index.ts` only as a barrel. A feature barrel explicitly re-exports its completed value, such as `ProductsBlock`, from `block.ts`. Keep the Model Schema internal to the feature and give the completed export the checked producer/header boundary below. The parent barrel can re-export feature namespaces to keep those structural names distinct.

Bindings, operations, views, and complete Message contracts still come from the completed Block. Keep local authoring values, lifecycle registries, and implementation helpers private. Shared domain concepts belong in a separate `domain/` barrel. Focused tests can import their owning implementation modules without adding test access to the feature's public surface.

::Snippet{name="indexReexports" label="Index re-exports"}

Consumers use `Products.ProductsBlock.Model` when composing parent Model Schemas. They pass `Products.ProductsBlock` to Binding helpers, or import `ProductsBlock` directly in composition files. Domain modules use namespace imports too.

::Snippet{name="indexUsage" label="Completed features and domain namespaces"}

`ProductsBlock` exposes the feature contracts without revealing its internal file layout. Parent composition starts from `ApplicationDefinition.makeBinding(ProductsBlock, ...)`.

### Keep Model Schema dependencies small

Define parent fields through the child's independent public contract: `ProductsBlock.Model`. The Definition exposes that Schema before update, view, and child implementations are completed. Reading it does not require TypeScript to reconstruct the implementation graph.

::Snippet{name="blockFeatureExports" label="Public contract and implementation Layer"}

The feature barrel exports the public Block contract and its implementation `layer`. Implementation files import Model from its owning module. Keep shared domain Schemas independent of Composition and completion.

Do not add casts, broad Block annotations, repeated factory calls, or copied Schemas to hide a type expansion. The public declaration supplies the boundary. The Schema performance lint rule also retains recognition of older checked native assemblies for low-level fixtures; new application code uses the independent contract.

::Snippet{name="parentSchemaCompletedBlockBad" label="❌ Parent Schema through implementation completion"}

::Snippet{name="parentSchemaGuardedModel" label="✅ Parent Schema through the public contract"}

### Emit Public Block Declarations {#declaration-emission}

Published Blocks expose a contract whose size is independent of the implementation graph. Ordinary feature exports need no preparation function or `FromAssembly*` annotation.

::Snippet{name="blockDeclarationBoundary" label="Public contract declaration boundary"}

Generic libraries may retain a named interface to describe their Schema refinement. Keep nominal key types reachable through the owning public subpath, using a type-only export when the runtime token is internal.

Run declaration emission for the package's real entrypoints and compile a relocated consumer without access to source. A passing `noEmit` check does not establish declaration portability. Check Services, constructor errors, operation channels, initialization inputs, and view inputs in that consumer. Editor latency and compiler cost need their own measurements.

### Keep Barrel Dependencies Pointing Inward

Each `blocks/index.ts` explicitly re-exports its immediate child namespaces and passive contracts. Parent code imports those children through that barrel. The exported child modules must not import the application root in return. A local `message.ts` should not import child Blocks to declare `Got*` variants. Composition derives those wrappers from its registered Bindings. This keeps the local Message module independent of child completion and avoids a cycle through `blocks/index.ts`.

Within a feature, import implementation pieces from their owning modules rather than from the feature's own completed barrel. For ordinary child features built in the same source project, use the passive contract and define parent Model fields with `Products.ProductsBlock.Model`. Child implementation files must not import their parent or its completed barrel. Keep shared domain Schemas in leaf modules that do not import either Composition.

Keep shared leaf modules independent of the root. Pass parent-owned rendering capabilities through function arguments or Block `viewInputs`, and make stateful shared behavior its own Block. The parent then provides the capability at the view boundary while each Page remains importable through the one-level barrel.
