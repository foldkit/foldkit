# Public Story and Scene runner compatibility

The normal `foldkit/story` and `foldkit/scene` entrypoints and root `Story`/`Scene` namespace imports expose both runner forms:

- `Story.story(update, ...steps)` and `Scene.scene({ update, view, ... }, ...steps)` remain synchronous and return `void`.
- A Block descriptor or `{ block, ... }` config returns a deferred scoped Effect. Supply `init(...)` or `given(model)` first, and provide constructor Services or implementation Layers through Effect.

The public dispatchers reuse the existing native and scoped implementations. They retain their exact overloads, with the ordinary signatures last so utility types retain the existing synchronous result. `given`, `model`, Command and Subscription helpers, and the remaining original exports retain their identities. `init` and the existing `withBlock` acquisition helper are available from both entrypoints; `messageIn` remains Story-only. The experimental testing entrypoint remains available.

Scene configuration modes are disjoint. The synchronous config reserves `block`; the scoped config reserves `update` and `view`, because it obtains them from the acquired implementation. Mixed configurations are rejected by types and by runtime validation for erased callers.

## Verification

After building the isolated Foldkit package:

```sh
node setup.mjs
node verify.mjs
```

The verifier copies only built Foldkit distributions and manifests into an isolated workspace. It checks source, runtime, declarations, and a strict relocated consumer with `skipLibCheck: false` and no library or application implementation source fallback.

The runtime proof covers native synchronous return values, unchanged helper and root namespace identities, deferred acquisition, Scope cleanup, inspection of acquired init results through `withBlock`, exact child delivery and OutMessage policy, dispatch Context, routing, typed construction failure, and useful errors for erased invalid subjects. Source and emitted checks preserve named init-result Models and exact construction channels. They reject incorrect initializer and Message payloads, missing or invalid Context, missing constructor providers, headless Scenes, routing without registration, and mixed Scene modes.

Exporting a full acquired init result initially failed with TS4023 because declaration emission expanded the canonical result's private registration symbol. Named `ExecutableReturn` and `ExecutableReturnWithOutMessage` interfaces now retain the existing canonical result contracts through inference. The proof checks exact registration, execution-capability, and OutMessage channels without consumer annotations.

Advanced raw update sequences can bind `Test.toParentMessageFor` to an acquired TestBlock. Its optional second Binding selects that actual child's graph for nested delivery; it does not acquire a separate child implementation. The mapper retains exact owner, key, and child Message checks, and runtime registration rejects foreign Bindings and spread copies of acquired facades. An envelope from a separately acquired child remains foreign to the root's selected child graph. Ordinary Block Stories continue to use `Story.messageIn`.

Copied declaration controls remove each runner overload, each Scene mode reservation, the scoped provider requirement, the public `withBlock` export, and acquired-parent evidence. Another restores the unnamed init-result return and must reproduce TS4023. Copied runtime controls misroute Block Stories to the native implementation or remove selected-child graph resolution. Every control must fail its relevant gate; restored gates must pass. No canonical package artifacts are mutated.

Generated output is ignored. The latest result is recorded in `verification/latest.json`.
