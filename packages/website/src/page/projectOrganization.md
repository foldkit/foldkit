# Project Organization

Start a Foldkit application in one module. Split it when a feature becomes easier to understand as its own state machine.

## Starting Simple

The smallest application keeps Model, Messages, init, update, and view in `main.ts`. A separate `entry.ts` creates and runs the runtime. Tests can then import `main.ts` without booting the application as a side effect.

Add `story.test.ts` and `scene.test.ts` beside it. The [Counter example](/example-apps/counter) shows this layout.

## File Layout

When one file becomes hard to navigate, separate the root pieces and give each [Submodel](/core/submodel) its own feature folder.

::Snippet{name="fileLayout" label="Recommended application structure"}

Each feature folder owns its Model, Messages, update, view, Commands, Subscriptions, Mounts, ManagedResources, handler Layers, and tests. Do not create empty files only to match the diagram. Add a file when the feature has that concern.

In the diagram, `products/service.ts` owns the feature's `ProductCatalogLayer` business service. The feature's `EffectsLayer` export provides it beneath the product handlers. Root `environment.ts` owns concrete HTTP, RPC, and browser provider Layers. Root `storage.ts` defines separate `LocalStorage` and `SessionStorage` service tags and binds them to their platform providers. Applications that do not need those concerns omit the files.

Keep Commands beside the update that returns them. A feature that fetches its own data owns that Command instead of importing it from a root Command collection. Extract `message.ts` when a Command needs to import its result Message constructors without creating a cycle.

A feature that declares Subscriptions owns `subscription.ts`. The parent lifts that record into its own Model and Message types. See [Subscription Organization](/patterns/subscription-organization).

Split a large feature again only when its own files become difficult to navigate. The [Typing Terminal room source](https://github.com/foldkit/foldkit/tree/main/packages/typing-game/client/src/page/room) has `view/` and `update/` subfolders inside one Room feature.

## Composing Handler Layers

Keep each handler attached to the Command, Subscription, Mount, or ManagedResource definition it implements. Compose `LoadProducts.layer` or `subscriptions.productUpdates.layer` directly in the feature's `EffectsLayer`. Name a standalone binding `LoadProductsLayer` only when that individual provider is intentionally public or independently reused outside `EffectsLayer` assembly, and name an external alternate `LoadProductsTestLayer`. The handler owns the translation from Foldkit args or dependencies into an Effect or Stream. External clients stay in its Effect requirements.

When a feature is split across modules, its `layer.ts` imports the definitions and combines their attached `.layer` recipes under one `EffectsLayer` export. The bundle also includes each child feature's `EffectsLayer`. It may provide business services that the feature owns while leaving concrete HTTP, storage, RPC, and browser providers open for the application root. Import Effect's module as `Layer`; the public bundle has a different name, so no alias is needed.

In a small application, `main.ts` can export an `EffectsLayer` with the handlers it owns, and `entry.ts` can assemble and run the application directly. Add separate `application.ts` and `layer.ts` roots when several features make those responsibilities useful: `application.ts` lifts registrations and exposes application assembly, while `layer.ts` composes root `EffectsLayer`, `ServicesLayer`, `AppLayer`, and any alternate `AppTestLayer`.

::Snippet{name="applicationFeatureLayer" label="Feature handler Layer composition"}

Products provides `ProductCatalogLayer` privately inside its `EffectsLayer` bundle. The catalog's external dependencies stay open for the root's production or test providers.

The application root repeats the same composition with its own handlers and the `EffectsLayer` export from each top-level feature. It also chooses the concrete providers for the environment where the app runs.

::Snippet{name="applicationRootLayer" label="Root handler Layer composition"}

`LocalStorageLayer` and `SessionStorageLayer` implement distinct application service tags, so both stores can coexist without changing the platform `KeyValueStore` identity inside either provider. Root `EffectsLayer` exports the real handlers for both roots. `AppLayer` provides `ServicesLayer`; `AppTestLayer` provides `ServicesTestLayer` beneath that same handler bundle.

The entry imports the application assembly and `AppLayer`, then supplies the Layer with one `Application.provide` call. In the factory form shown below, `application.ts` exports `makeApplication(container)` and the entry chooses the DOM container before calling it. Use this form whenever tests or server tooling import the registration module, or when the entry chooses the container. A static `application` export is acceptable only when every importer is browser-side and runs after the intended container exists.

Adding another handler or changing an environment provider changes Layer composition without adding another provision step to `entry.ts`. A test root can compose the same feature Layers with test providers before the application Layer is built, so whole-application execution keeps the real handlers. See [Providing application handler Layers](/core/runtime#overview) for the entry code.

## Composing Runtime Registrations

Handler Layers and runtime registrations are parallel graphs with different jobs. A feature's `EffectsLayer` supplies implementations. Its `subscriptions`, `managedResources`, and `mounts` say which behaviors Foldkit manages for that feature. Keep both exports at the feature boundary, then let `application.ts` assemble the root program.

::Snippet{name="applicationRegistrations" label="Root runtime registration composition"}

`Subscription.lift` and `ManagedResource.lift` connect a child feature's Model and Messages to its parent. Direct `Subscription.aggregate(first, second)` keeps the individual Subscription definitions, including their declared Messages, `.layer` recipes, and `toLayer` helpers. The curried form, `Subscription.aggregate<Model, Message>()(first, second)`, constrains the parent Model and Message while preserving those definitions and their exact handler requirements. Let the assembled record infer its type so a module boundary does not erase its entry metadata.

`Application.make` receives the completed registration graph inside `makeApplication`. `entry.ts` imports that factory and `AppLayer`, resolves the container, then starts the provided application. It does not import feature Commands, Subscription handlers, Mount handlers, or ManagedResource handlers.

The same propagation applies to UI component bundles. A feature using the standard UI set merges `UI.EffectsLayer` into its effect bundle and adds `UI.mounts` to its registration bundle. A feature using a selective component set composes those components' `EffectsLayer` and `mounts`. Instance factories such as Slider and Toast return their own effect and Subscription bundles; the feature that creates an instance also owns those returned registrations.

When a parent update needs an explicit requirement union, derive each child branch from `Update.RequirementsOf<typeof Child.update>` and include other Command-producing helpers. Do not derive it from `Layer.Success<typeof Child.EffectsLayer>`: a feature effect bundle may also implement Subscriptions, Mounts, or ManagedResources that the update never returns.

## Where Tests Live

Colocate tests with the boundary they exercise. A feature's `story.test.ts` drives its update. Its `scene.test.ts` drives its view, using `withViewInputs` when the view requires them.

Test rendering, interactions, Commands, and OutMessages inside the feature that owns them. Test at the parent when the contract involves parent-computed ViewInputs, wrapper routing, a lifted Command, or the parent's response to an OutMessage.

Keep root Scene tests for flows that cross features or pages. Split several root flows by subject, such as `checkout.scene.test.ts` and `cart.scene.test.ts`.

When one folder holds more than one test of a kind, prefix with the subject, like `login.story.test.ts`. Pure modules in `domain/` need neither primitive; they take ordinary Vitest tests beside them.

See the [Testing](/testing) page for the full Story and Scene reference.

When a test starts the full application, compose the production feature Layers with test implementations of their external services before building the application Layer. This runs real Command, Subscription, Mount, and ManagedResource handlers. Replace a whole handler only when the test intentionally supplies its result or lifecycle path; that narrower orchestration test does not cover the replaced handler.

## Domain Modules

Put shared business concepts in `domain/`. Each module owns its Schema and pure operations.

::Snippet{name="domainModule" label="Domain module"}

Import the module as a namespace and call operations such as `Cart.addItem` and `Cart.removeItem`.

## Index Re-exports {#index-reexports}

Use `index.ts` only as a barrel. Re-export the feature's application surface: `EffectsLayer`, plus `subscriptions`, `managedResources`, or `mounts` when the feature owns them.

::Snippet{name="indexReexports" label="Index re-exports"}

Consumers can then import the feature as a namespace.

::Snippet{name="indexUsage" label="Namespace usage"}

`Products.` exposes the feature's public surface without revealing its internal file layout.

### Keep Barrel Dependencies Pointing Inward

A parent barrel may re-export each immediate child namespace, and application code may import those namespaces from the barrel. The exported child modules must not import the application root in return. If `message.ts` imports `Home` from `page/index.ts` while a module re-exported by `page/index.ts` imports that root Message, the barrel closes a circular dependency.

Keep shared leaf modules independent of the root. Pass parent-owned rendering capabilities through function arguments or Submodel `viewInputs`, and make stateful shared behavior its own Submodel. The parent then provides the capability at the view boundary while each Page remains importable through the one-level barrel.
