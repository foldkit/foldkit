---
'foldkit': minor
'@foldkit/ui': minor
---

Move the implementations of Commands, Subscriptions, Mounts, and ManagedResources into Effect Layers. The application now selects effect implementations and their service providers in one Layer graph before startup. Production and ordinary execution tests can use the same handlers while supplying different HTTP, storage, RPC, clock, browser, or other external services beneath them.

The Runtime builds the provided application Layer once for each start. The final definition argument is an Effect that constructs its handler during that build, and the definition exposes the attached recipe as `.layer`. Commands, Subscriptions, and Mounts return a function that performs work with the current args, dependencies, or element. ManagedResources return an object with `acquire` and `release` functions that manage each Model-controlled handle. Use `Effect.gen` to capture services and return the handler. Use `Effect.succeed(handler)` when construction has no work to perform.

Commands, Mounts, Subscription entries, ManagedResource entries, and experimental Query definitions may omit the final constructor argument when an external host owns the implementation. Those definitions have no `.layer`; the host supplies its implementation through `toLayer`. An attached `.layer` uses the same construction path and definition identity as `toLayer(constructor)`. A ManagedResource constructor must supply both `acquire` and `release`, whether attached to the entry or passed to `toLayer`.

Migrate each primitive as follows:

1. **Commands.** Remove `execute` from `Command.define`. Pass `Effect<invocation function>` after the config and include `Definition.layer` directly in the feature's `EffectsLayer`.
2. **Subscriptions.** Give every `Subscription.make` entry a stable handler name and `messages` declaration. Keep `modelToDependencies` on dependency-bearing entries, pass `Effect<dependencies => Stream>` after the callbacks config, and include `entry.layer` in the feature's `EffectsLayer`.
3. **Mounts.** Remove `execute` from `Mount.define` and `Mount.defineStream`. Pass `Effect<element handler>` after the config, register the definition in `Application.make({ mounts })`, and include `Definition.layer` in the feature's `EffectsLayer`. Registration is required because view and `Html` do not carry Effect requirements; a registered Mount that is absent from the rendered tree performs no work.
4. **ManagedResources.** Give every entry a stable handler name and pass `Effect<{ acquire, release }>` after its config. Include `entry.layer` in the feature's `EffectsLayer`. Both callbacks are required whenever a constructor is supplied. A no-op `release` is appropriate only when scoped acquisition, such as `Layer.build` or `Effect.acquireRelease`, already registered the real cleanup. The handler lives for the application start while acquired handles retain their Model-driven lifetime.
5. **Runtime resources.** Remove the `resources` field from runtime configuration. Define the program with `Application.make` or `Application.makeElement`, supply the composed `AppLayer` with `Application.provide`, then call `Runtime.run`, `Runtime.hydrate`, or `Runtime.embed`.

Compose attached recipes directly as `Definition.layer` in each feature's combined `EffectsLayer`, such as `Search.EffectsLayer`. When a recipe needs its own exported or reused binding, name it `FooLayer`; name an external alternative `FooTestLayer`. At the application root, combine feature implementations in `EffectsLayer`, external providers in `ServicesLayer`, and export `AppLayer` from `Layer.provide(EffectsLayer, ServicesLayer)`. Import Effect's module as `Layer`; the bundle names avoid an alias.

Foldkit UI exports `UI.EffectsLayer` and `UI.mounts` for the default component set. Selective applications can compose each component's `EffectsLayer` and `mounts`. `Slider.forRoot(name, getTrackRoot)` and `Toast.make(name, payloadSchema)` return instance-owned Subscription and effect bundles; compose those exports where the instance is created.

`Update.make` infers Command requirements and OutMessages across Message branches while preserving required, optional, and rest context parameters. `Update.RequirementsOf<typeof update>` reads the Command services from an update contract without including lifecycle-only services. `Application.make` and `Application.provide` carry all remaining handler and service requirements until the selected Layers satisfy them.

Each handler name belongs to one definition within an application. `Application.make` rejects distinct registered Subscription, Mount, or ManagedResource definitions with the same name. A Command reports a mismatched Layer when it runs because Commands are created by update rather than registered with the application. Multiple lifted uses of the same definition can share its Layer.

Each registered ManagedResource tag key has one lifecycle owner. `Application.make` and `Application.makeElement` reject the same resource key under multiple registration keys, including separately created tags with matching keys. Give independent resource instances distinct tag keys so each accessor resolves its own handle.

Application Layer construction happens before Flags, init, or the first render. A construction failure therefore stops startup before a Model exists for a crash view. `Runtime.hydrate` validates the server handoff before acquiring the application Layer.

ManagedResource release now waits for the explicit callback and scoped finalizers before clearing the handle or dispatching `onReleased`. Cleanup defects are contained so remaining finalizers and the lifecycle transition can complete.
