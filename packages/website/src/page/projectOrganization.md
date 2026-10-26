# Project Organization

## Overview

Organize a Foldkit application around ownership. A feature owns its state machine and local effects. Its parent owns the policy that connects it to siblings and the application. The browser entry owns host configuration, Service provision, and Runtime startup.

:::tip A complete workspace
The [Workspace example](/example-apps/workspace) applies these conventions to shared issue data, routed editors, a project board, comments, and a command palette. Its source shows parent-owned coordination, optional keyed children, and nested Dialog and DragAndDrop Blocks.
:::

Keep these ownership boundaries visible as the application grows:

| Boundary    | Typical home                                                 | Responsibility                                                                             |
| ----------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Definition  | `definition.ts`, or the top of `composition.ts` when unnamed | Early Model, Message, OutMessage, ChildInitContext, Command, lifecycle, and Step contracts |
| Composition | `composition.ts` or `composition/`                           | Parent-owned Bindings, Mount registrations, and graph-aware authoring                      |
| Assembly    | `block.ts` or compact `application.ts`                       | Produces an opaque draft and assembles it as a completed Block                             |
| Host        | `entry.ts`                                                   | Chooses page or element ownership, supplies Services, and starts Runtime                   |

`makeBinding` configures one parent-child relationship. A child with OutMessages then selects its parent-owned policy through `withOutMessagePolicy`. Including that full Binding in `makeComposition({ bindings })` registers it. These calls and `prepareBlock` are passive: they do not build Layers, run handlers, or start lifecycle work. `Program.make` or `Program.makeElement` adds host behavior without starting anything. A browser Runtime builds Layers, calls init, and starts effects after the entry starts it.

## Starting Simple

Start with one cohesive module. The smallest application keeps Model, Message, Composition-owned init, update, view, `ApplicationDefinition`, `ApplicationComposition`, and `ApplicationBlock` together in `application.ts`. A separate `entry.ts` chooses the browser container and startup inputs, creates the Program, supplies shared Services, and starts the Runtime. Tests and server tooling can import the passive Block without starting a browser Runtime.

Split when those responsibilities become easier to navigate separately. Once one root responsibility moves out of `application.ts`, move the rest to files named for what they own. Retain `definition.ts` and a named `ApplicationDefinition` when Commands, Mounts, resources, child Bindings, or Steps use its authoring methods. When the factory's only use is `makeComposition`, place the top-level `Block.makeDefinition('Application', ...).makeComposition()` chain in `composition.ts` instead. That file owns Bindings, OutMessage folds, complete child and Mount registration, `ApplicationComposition`, and an optional `ApplicationViewBuilder`. `init.ts`, `update.ts`, and `view.ts` own behavior authored through that Composition. `block.ts` assembles `ApplicationBlock`. Even a graphless split root has a `composition.ts` so every root follows the same passive Definition → Composition → Block sequence.

Use `composition/composition.ts` and an explicit `composition/index.ts` barrel only when substantial Binding policies need their own modules. Remove the emptied `application.ts` instead of retaining it as a forwarding barrel.

Add `story.test.ts` and `scene.test.ts` beside the behavior they test. The [Counter example](/example-apps/counter) shows a compact root.

A compact feature with no children or Mounts can stay in one file. Name its empty Composition before authoring the primary view, then complete that same value. Once that feature has a separate `definition.ts`, put even its empty Composition in `composition.ts`, so contracts and graph assembly retain distinct import directions:

::Snippet{name="organizationGraphlessBlock" label="Small graphless feature"}

## File Layout

Split a module when separate responsibilities make it easier to navigate. The following structure shows optional homes for those responsibilities; do not create empty files to match it.

::Snippet{name="fileLayout" label="Application and feature file structure"}

Use standard structural names within each feature: `Model`, `Message`, `OutMessage`, `Flags`, `init`, `update`, `view`, `subscriptions`, `managedResources`, `mounts`, and `EffectsLayer`. The completed Block supplies context in parent code, such as `HomeBlock.Model` and `HomeBlock.Message`. Declare only local facts in a feature's `Message`; Composition adds child delivery to its complete Message Schema. Domain Schemas and individual effects retain descriptive names such as `Person`, `FetchPeople`, and `FocusSearchInput`.

Use direct Schema type queries for routine application annotations. Inside the feature that owns a Schema, write `typeof Model.Type`, `typeof Message.Type`, or `typeof OutMessage.Type`; this keeps the query on the local contract and avoids importing the completed Block back into its implementation. A parent or other consumer queries the completed child instead, such as `typeof SearchBlock.Model.Type`, `typeof SearchBlock.Message.Type`, or `typeof SearchBlock.OutMessage.Type`. Let Definition callbacks and Composition-owned handlers infer their parameters.

Do not add colocated aliases such as `type Model = typeof Model.Type` merely to shorten those queries. Purposeful aliases remain appropriate for public library contracts and for generic, mapped, or conditional types such as `Block.ViewBuilderFor<typeof FeatureComposition>`. Existing external application aliases remain valid TypeScript; this is an application organization preference rather than a framework API restriction.

### Early Contracts and Local Effects

Keep `definition.ts` focused on the early typed `FooDefinition` and its Model, Message, OutMessage, and ChildInitContext contracts when Definition authoring methods need that named value. Export the Step helpers used by split implementation modules from this file and named-import those helpers where they are used. Keep them out of the feature barrel. A compact feature destructures its Step helpers beside its Definition; a module with several Definitions can keep qualified calls when the qualifier identifies the owner. Never put a Composition or owner-specific ViewBuilder in `definition.ts`. When no authoring method needs a named Definition, move its contract imports into `composition.ts`, chain `makeComposition()` directly from the top-level factory call, and omit `definition.ts`. Do not move that call into a function, callback, loop, or conditional because its owner identity must remain a module singleton. Split implementation files import retained Definitions without loading the completed feature, and import graph-aware authoring values from `composition.ts`. A compact feature need not extract them.

Commands belong to the feature whose update returns them. Keep small definitions beside update; extract `command.ts` when several definitions or substantial handlers make a separate file useful. Extract `message.ts` when handlers need result constructors and importing the update would create a cycle.

Put shared local Mount definitions in `mount.ts`. Both Composition and view import them from that module. Defining a Mount inside `view.ts` would make Composition import the view that already imports Composition.

### A Feature with a Child

For a split feature, `composition.ts` owns its child Bindings, complete child and Mount registration lists, and single `FeatureComposition` value. A new straightforward Binding goes immediately beside that `makeComposition` call. For example, `dashboard/composition.ts` connects a Counter:

::Snippet{name="organizationChildComposition" label="Child Binding and registration"}

An update can import `CounterBinding` to invoke its operations. Generated child envelopes route through the Binding automatically. The view imports `DashboardComposition`. Including `CounterBinding` under `bindings` also includes the completed child's handler graph and lifecycle declarations.

`block.ts` imports the Composition, init, update, view, and local `EffectsLayer`, returns `DashboardComposition.prepareBlock(...)` from its private producer, then calls `Block.assemble(prepare)`. Its explicit `index.ts` exports the completed `DashboardBlock` with the checked producer/header boundary; parent Schemas use `DashboardBlock.Model`. Shared domain Schemas and selectors have a separate `domain/` barrel. Internal implementation files do not import their own completed barrel.

### A Feature with Mounts Only

A split Mount-only feature also uses `composition.ts`. The Composition assembles capabilities whether or not it has children. For example, `panel/composition.ts` registers the Mount from `panel/mount.ts`:

::Snippet{name="organizationMountComposition" label="Mount-only Composition"}

The view imports both the Composition and the local Mount definition:

::Snippet{name="organizationMountView" label="View using its registered Mount"}

This Panel Definition declares Model and Message, without an OutMessage. Registration grants its view permission to use the Mount. The completed export therefore uses `FromAssemblyWithView` and supplies the handler recipe through its local `EffectsLayer`:

::Snippet{name="organizationMountBlock" label="Mount handler at Block completion"}

### Substantial Binding Policy

A Binding also contains the parent's integration policy for its child. Inline a short unkeyed policy with `makeBinding(ChildBlock, ...).withOutMessagePolicy({ fold: ParentDefinition.makeOutMessageFold(ChildBlock, handlers) })`. A fold always names its completed child, including when it is inline. Use contextual `makeOutMessageForward(handlers)` when the parent declares OutMessages and forwards at least one variant; pass the completed child explicitly when extracting the forward. Extract a supporting file when the policy includes substantial OutMessage handling, custom Model writes, or Command lifting. For example, an Editor's Dialog policy may save the draft when the Dialog closes:

::Snippet{name="organizationDialogPolicy" label="Extracted Dialog integration policy"}

Put that policy in `editor/composition/dialog.ts`. The single assembly point becomes `editor/composition/composition.ts`, with an explicit `composition/index.ts` barrel. Straightforward Bindings remain in the assembly file alongside the complete registrations:

::Snippet{name="organizationPolicyComposition" label="Feature assembly with an extracted policy"}

The directory barrel exports the intended assembly surface explicitly:

::Snippet{name="organizationCompositionBarrel" label="Explicit Composition barrel"}

Do not create arbitrary groups such as pages or controls, a second `bindings` list, or a global list of Bindings. The root follows the same directory layout: `composition/composition.ts` owns graph assembly and `composition/index.ts` exports its intended surface. The assembly imports extracted policies directly from their sibling modules, and the barrel re-exports actual values such as `HomeBinding`, `RoomBinding`, and `ApplicationComposition`. External consumers import from `composition.ts` or that explicit barrel, never from a policy or assembly implementation path. Use a factory only when constructing the Binding requires caller-owned configuration. Do not add a namespace or factory merely to group one policy file.

A substantial one-way policy may live in its own file and usually keeps the fluent Binding declaration. Keep self-referential and reciprocal policies in the same parent assembly module. Declare the ordinary Bindings first, author the folds against those operation-bearing values, then select `FooBindingWithOutMessagePolicy` values and register those selected values. This keeps the coordination in one parent-owned graph without circular imports or recursive initializer annotations.

### Views, Behavior, and Import Direction

Author the primary view through `FeatureComposition.makeView` or `makeView.withInputs`, leaving its `h` parameter inferred. When local helpers need its builder type, declare `type FeatureViewBuilder = Block.ViewBuilderFor<typeof FeatureComposition>` immediately after the Composition with no blank line. Export the alias only when another file uses it. Ordinary view helpers receive that builder and the Model, domain value, or context they use. The alias retains Message, child, and Mount capabilities without constructing anything at runtime.

The owner prefix distinguishes a builder derived from one Composition at a plain type import site. `Model`, `Message`, and `OutMessage` keep their standard architecture names because the completed value supplies their feature context, such as `SearchBlock.Model` and `SearchBlock.Message`. Helpers shared across features can use a generic `HtmlBuilder` for ordinary content. Forward Mount-bearing child Attributes through a typed caller-owned render callback that retains the actual parent builder. See [Builder ownership](/core/view#builder-ownership) for the shared Dialog example.

Keep substantial behavior in `init.ts`, `update.ts`, or a folder-named implementation file such as `workHistory/workHistory.ts`. Extracted init and update modules import the named Composition and author their functions through `FeatureComposition.makeInit` and `FeatureComposition.makeUpdate`. Use an exhaustive `makeUpdate` record for local Message handlers; it retains each handler's output contract. Use `makeUpdate.withContext` when handlers need dispatch context. The callback overload is removed; [mixed connected results](/core/update#preserving-local-results-beside-connected-operations) need canonical local Step results. Keep child startup ownership beside each Binding. Omit `init` for an argument-free required direct field. Use `init.contextToArgs` for required inputs or automatic unkeyed optional presence, `init: false` for a parent-owned required field, and `init.instances` for an exact keyed array. Use `Binding.init` for an Option-wrapped keyed occurrence, custom storage, or dynamic creation. The init plan supplies parent-owned fields, decoded `childInitContext` when a selector uses it, and ordered Steps; the Composition assembles child fields and Commands. Command collection order does not sequence effects or completion. Init and update never import the completed feature. Composition must not import them in return. A substantial `update/` directory uses `index.ts` as its explicit barrel and `update.ts` as the parent-owned local Message handlers. The same rule gives a view directory `view/index.ts` and `view/view.ts`.

Dependencies point from contracts to local declarations and policies, then to Composition, view, and completed Block. An update or view can import a Binding from Composition. Composition must not import the update implementation, primary view, or completed Block in return. If one child policy needs a parent Step, define the policy beside the Binding or extract the pure operation into a leaf module that does not depend on Composition. A helper that returns a connected sibling operation uses the parent's `makeStep` producer so it preserves the Binding requirement and defers application; it does not invoke that operation against a plain Model parameter. Keep reciprocal sibling policies together in the parent assembly and defer each sibling call through its policy callback. A one-way policy may remain in its own file.

Name an extracted update-handler file after its exported handler, such as `update/handleChangedUrl.ts` for `handleChangedUrl`. Keep substantial URL-change handling there. Prepare the next Route and URL, then compose the child Steps and return the required Commands in a visible order. Keep each Route identity comparison beside the behavior it controls. Put reusable Route selectors in `route.ts` and sidebar selection with the navigation-display helpers. Composition declares child startup; the URL handler decides how child state changes during navigation.

Name selectors for the values they derive and application Steps for the transitions they describe. Use `initializeIssueDetailIfMissing` when a Step preserves an existing editor and initializes an absent identity. Reserve `sync` and `observe` for functions whose responsibility is actual synchronization or observation. A Step returns the next Model and Commands; Runtime performs those Commands later.

Changing Routes need not remove child state. Keep retained editors in parent storage keyed by entity identity when returning to an entity should preserve its state. The Route selects which editor is rendered. Subscription activation and admission of pending results are separate policies. Build a [Route Transition](/core/routing-and-navigation#route-transitions) before replacing the Route when behavior depends on entry, exit, or a change of identity within one Route. Data arriving after navigation still needs its own initialization policy.

## Root Application Assembly

In a split root, `composition.ts` owns the complete child and Mount graph and `ApplicationComposition`. Put straightforward root Bindings and their OutMessage folds directly beside its `ApplicationDefinition.makeComposition` call. Register the policy-selected Binding when a child declares OutMessages. Extract substantial policies to files such as `composition/home.ts`; then `composition/composition.ts` owns assembly, `composition/index.ts` is an explicit barrel, and the assembly module imports those policies directly from sibling modules. Composition depends on `definition.ts`, completed children, and local policy declarations. It never imports root init, update, or view.

::Snippet{name="applicationRegistrations" label="Root child graph"}

When root authoring methods need it, `definition.ts` imports the split root's Model and Message Schemas and exports `ApplicationDefinition`. Root Commands, Subscriptions, and composition import that contract directly. A graphless root whose factory only creates the Composition places the factory chain in `composition.ts` instead. A simple root `EffectsLayer` stays with its Command definitions in `command.ts`; extract `layer.ts` only when Layer composition is substantial or reused.

Root `services.ts` composes `ApplicationLayer`. `block.ts` imports each implementation field from its real owner and assembles `ApplicationBlock`. The entry imports the Block and Layer, chooses browser inputs, creates the Program, and invokes the Runtime:

::Snippet{name="applicationEntryPoint" label="Browser application entry point"}

Keep browser container lookup, routing callbacks, DevTools configuration, and startup Flags visible in `entry.ts`. Tests and server entries import the passive Composition and implementation pieces without starting the browser Runtime. Do not collect unrelated root behavior in `root.ts` or aggregate Subscriptions in a vague `lifecycle.ts`; use `subscription.ts` or `subscription/subscription.ts`.

## Separate Handler Recipes from Application Services {#composing-handler-layers}

Foldkit handlers and ordinary application Services solve different problems. A Command Definition identifies work the Runtime may invoke. `LoadProducts.layer` is the recipe that constructs the handler for that Foldkit Definition. `ProductCatalog` is an ordinary Effect Service the handler uses to do its work.

Keep canonical handlers attached to their Command, Subscription, Mount, and ManagedResource definitions. Compose attached recipes such as `LoadProducts.layer` in the feature's local `EffectsLayer`. Name a standalone `LoadProductsLayer` only when that individual provider is intentionally public or independently reused, and an external alternative `LoadProductsTestLayer`.

Compose a small local bundle in `block.ts`. Extract `layer.ts` when the composition is substantial or independently reused. Pass the local bundle to `FeatureComposition.prepareBlock`. A feature can provide business services that it owns while leaving HTTP, storage, RPC, and browser providers open for the root.

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

Reading `ProductsBlock.Model` from an inferred source Block can make TypeScript resolve init, update, views and the child graph before checking the parent Schema. An explicit export header gives the completed value a directly named Model member while preserving its checked implementation contract.

::Snippet{name="blockFeatureExports" label="A checked preparation producer and export header"}

Choose the helper from the Definition's declared OutMessage and the assembled view:

| Assembled view | Declared OutMessage | Export annotation                           |
| -------------- | ------------------- | ------------------------------------------- |
| Yes            | No                  | `Block.FromAssemblyWithView`                |
| Yes            | Yes                 | `Block.FromAssemblyWithViewAndOutMessage`   |
| No             | Yes                 | `Block.FromAssemblyWithOutMessage`          |
| No             | No                  | `Block.FromAssemblyWithoutViewOrOutMessage` |

Each helper takes `typeof Model` and `typeof prepare`. Name the single private zero-argument producer `prepare`, and put the checked export immediately after it with no blank line. Initialize it with `Block.assemble(prepare)`. Use a descriptive producer name only when one file genuinely contains multiple preparation producers. The four helper names keep the view and OutMessage shapes explicit; there is no unified `FromAssembly` helper. The longer annotation gives TypeScript a direct Model member without making a parent infer the whole source implementation merely to read its Schema. The producer infers the opaque draft, and the helper checks the exact completed contract and Model Schema at the assembly boundary. A cast, broad Block annotation, `satisfies`, raw producer invocation, or annotation without the matching `Block.assemble` call does not establish this boundary.

`provideHandlers` and `replaceEffectsLayer` preserve completed Blocks, but the Schema performance lint exemption does not extend to their full return contracts. Use the original checked `ChildBlock.Model` in the parent Schema and apply handler changes when creating its Binding. Both methods preserve the same Model Schema.

Parents can use the checked completed Block's Model directly; the feature barrel needs only the completed Block. Local implementation modules import Model from its owning module, never from their own completed barrel. Shared domain Schemas still belong in independent domain modules. Do not reconstruct a Schema, repeat a generic factory call, or erase Codec channels to create this boundary.

::Snippet{name="parentSchemaCompletedBlockBad" label="❌ Parent Schema through inferred assembly"}

::Snippet{name="parentSchemaGuardedModel" label="✅ Parent Schema through a checked Block boundary"}

The recommended `foldkit/no-completed-block-model-in-schema` rule follows proven Foldkit assemblies, immutable aliases and nested Schema wrappers. It accepts the four actual helper imports with a matching value annotation or same-name empty interface, matching zero-argument producer and `Block.assemble` finisher. A cast, `satisfies`, helper-shaped name or unannotated producer is insufficient. Ordinary `.Model` access, decoders and `typeof ChildBlock.Model.Type` annotations remain allowed.

This is a performance guardrail. It does not replace compiler checking or establish a response-time bound. The lint exemption is deliberately narrower than TypeScript: helper type aliases and reexport barrels, imported producer functions, arbitrary factories and dynamic aliases are outside its recognized boundary. Import the helper directly from `foldkit` or `foldkit/block` and keep the producer beside the completed export. Published generic UI contracts remain separate from this ordinary source authoring pattern.

### Emit Public Block Declarations {#declaration-emission}

A package that ships declaration files should give each public completed Block a named interface over its matching checked `FromAssembly*` header. Keep the private `prepare` producer, interface, and same-name value together as one assembly unit:

::Snippet{name="blockDeclarationBoundary" label="Naming a public Block declaration boundary"}

The feature barrel still re-exports one name, `CounterBlock`; TypeScript re-exports its type and value together. This changes no Runtime behavior. It gives declaration serialization a reusable name rather than repeatedly expanding the child producer through each parent.

JavaScript-only applications can retain the checked value annotation. There is no dependable child-count threshold for needing a serialization boundary: run declaration emission for the package's actual public entrypoints and check the resulting declarations as an external consumer. A passing `noEmit` check does not establish that they can be emitted. TS7056 reports a type that cannot be serialized under the compiler's limit; even a named child boundary does not guarantee that an arbitrarily large root producer will serialize. The interface is a compiler-work boundary, not a sealed contract against deliberate ambient declaration augmentation.

The [Workspace example](/example-apps/workspace) retains an exact named Binding tuple in `src/composition.ts` after an observed root TS7056 failure. Exporting that type lets other modules name the graph in emitted declarations, so `src/block.ts` keeps the ordinary checked assembly shown above. The tuple type and value must both change with the graph. Use this targeted boundary after reproducing a serialization failure; it does not establish unlimited declaration scaling. Editor performance needs its own measurement.

### Keep Barrel Dependencies Pointing Inward

A parent barrel may re-export its immediate children's named completed Blocks, and application code may import those values from the barrel. The exported child modules must not import the application root in return. A local `message.ts` should not import child Blocks to declare `Got*` variants. Composition derives those wrappers from its registered Bindings. This keeps the local Message module independent of child completion and avoids a common cycle through `page/index.ts`.

Within a feature, import implementation pieces from their owning modules rather than from the feature's own completed barrel. For ordinary child features built in the same source project, use the checked completed export and define parent Model fields with `Products.ProductsBlock.Model`. Child implementation files must not import their parent or its completed barrel. Keep shared domain Schemas in leaf modules that do not import either Composition.

Keep shared leaf modules independent of the root. Pass parent-owned rendering capabilities through function arguments or Block `viewInputs`, and make stateful shared behavior its own Block. The parent then provides the capability at the view boundary while each Page remains importable through the one-level barrel.
