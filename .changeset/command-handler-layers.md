---
'foldkit': minor
'@foldkit/ui': minor
---

Move the implementations of Commands, Subscriptions, Mounts, and ManagedResources into Effect Layers. The application now selects effect implementations and their service providers in one Layer graph before startup. Production and ordinary execution tests can use the same handlers while supplying different HTTP, storage, RPC, clock, browser, or other external services beneath them.

The Runtime builds the provided application Layer once for each start. An Effect passed to `toLayer` constructs a handler during that build. The returned function performs each Command invocation, Subscription start or restart, Mount acquisition, or ManagedResource acquisition with the current args, dependencies, element, or requirements. Use `Effect.gen` to capture services and return that function. Use `Effect.succeed(handler)` when construction has no work to perform.

Migrate each primitive as follows:

1. **Commands.** Remove `execute` from `Command.define`. Pass an `Effect` that returns the invocation function to `Definition.toLayer`, then include the resulting `FooLayer` in the feature's `EffectsLayer`.
2. **Subscriptions.** Give every `Subscription.make` entry a stable handler name and `messages` declaration. Keep `modelToDependencies` on dependency-bearing entries. Pass an `Effect` that returns the `dependencies => Stream` function to `entry.toLayer`.
3. **Mounts.** Remove `execute` from `Mount.define` and `Mount.defineStream`. Pass an `Effect` that returns the element handler to `Definition.toLayer`, register the definition in `Application.make({ mounts })`, and include its Layer in the feature's `EffectsLayer`. Registration is required because view and `Html` do not carry Effect requirements; a registered Mount that is absent from the rendered tree performs no work.
4. **ManagedResources.** Give every entry a stable handler name. Pass an `Effect` that returns `{ acquire, release }` to `entry.toLayer`. The handler lives for the application start while acquired handles retain their existing Model-driven lifetime.
5. **Runtime resources.** Remove the `resources` field from runtime configuration. Define the program with `Application.make` or `Application.makeElement`, supply the composed `AppLayer` with `Application.provide`, then call `Runtime.run`, `Runtime.hydrate`, or `Runtime.embed`.

Name individual production and test Layers `FooLayer` and `FooTestLayer`. Export each feature's combined handler bundle as `EffectsLayer`, such as `Search.EffectsLayer`. At the application root, combine feature implementations in `EffectsLayer`, external providers in `ServicesLayer`, and export `AppLayer` from `Layer.provide(EffectsLayer, ServicesLayer)`. Import Effect's module as `Layer`; the bundle names avoid an alias.

Foldkit UI exports `UI.EffectsLayer` and `UI.mounts` for the default component set. Selective applications can compose each component's `EffectsLayer` and `mounts`. `Slider.forRoot(name, getTrackRoot)` and `Toast.make(name, payloadSchema)` return instance-owned Subscription and effect bundles; compose those exports where the instance is created.

`Update.make` infers Command requirements and OutMessages across Message branches while preserving required, optional, and rest context parameters. `Update.RequirementsOf<typeof update>` reads the Command services from an update contract without including lifecycle-only services. `Application.make` and `Application.provide` carry all remaining handler and service requirements until the selected Layers satisfy them.

Each handler name belongs to one definition within an application. `Application.make` rejects distinct registered Subscription, Mount, or ManagedResource definitions with the same name. A Command reports a mismatched Layer when it runs because Commands are created by update rather than registered with the application. Multiple lifted uses of the same definition can share its Layer.

Each registered ManagedResource tag key has one lifecycle owner. `Application.make` and `Application.makeElement` reject the same resource key under multiple registration keys, including separately created tags with matching keys. Give independent resource instances distinct tag keys so each accessor resolves its own handle.

Application Layer construction happens before Flags, init, or the first render. A construction failure therefore stops startup before a Model exists for a crash view. `Runtime.hydrate` validates the server handoff before acquiring the application Layer.
