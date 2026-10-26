# Managed Resources

## Overview

Layers provided to the application live for the entire runtime. Some stateful handles should exist only while the Model is in a particular state: a camera stream during a video call, a `WebSocket` while on a chat page, or a Web Worker pool during a computation. Managed Resources give those handles a Model-driven acquire and release lifecycle, using the same dependency-diffing engine as Subscriptions.

Choose a ManagedResource when Commands or other consumers need access to the acquired handle. Model-gated listeners and scoped work with no handle consumer belong in a Subscription, which supports cleanup even when it emits no Messages. Check [lifecycle ownership](/core/subscriptions#lifecycle-ownership) before defining a resource accessor or acquisition Messages.

:::Info{label="The restaurant analogy"}
Application-scoped Layers are the kitchen equipment available all night. A Managed Resource is a specialty station set up only while the menu needs it. Changing the special tears down the old station and sets up the new one, just as changing camera requirements releases one stream and acquires another. A Command that asks for an inactive station receives `ResourceNotAvailable`.
:::

### Defining the Lifecycle

Create the handle accessor from the named feature with `FeatureDefinition.makeResource<Value>()('ResourceName')`, then define its lifecycle through `FeatureDefinition.makeManagedResources`. The feature name qualifies the accessor's local identity. The `modelToMaybeRequirements` function returns `Option.some(params)` while the handle should be active and `Option.none()` while it should be absent.

Give each entry a stable local handler name and set `config.handler` to a generator constructor that returns both `acquire` and `release`. Both functions are required whenever the handler is supplied. The entry exposes that attached recipe as `.layer`. When every entry has an attached handler, include the owned registry's `managedResources.layer` in the local `EffectsLayer` and pass the registry under `managedResources` to `FeatureComposition.prepareBlock`. `Block.assemble` then creates the Block that carries the lifecycle registrations and handler graph through parent Bindings. The root follows the same producer and finisher sequence, while `program.provide(layer)` supplies any ordinary Services the handler recipes still require. The constructed handler lasts for the application lifetime; each handle it acquires still starts and stops according to the Model.

Put the named authoring value and resource accessor in a shared module. The lifecycle registry and Commands must import the same accessor definition.

::Snippet{name="managedResourcesDefinition" label="Defining a shared resource accessor"}

::Snippet{name="managedResources" label="Camera ManagedResource lifecycle"}

### Requirements Transitions

The runtime compares the requirements after every Model change and performs the corresponding transition.

| Requirements transition                          | Runtime behavior                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `Option.none()` to `Option.some(params)`         | Acquire the handle, then dispatch `onAcquired`.                            |
| `Option.some(params)` to `Option.none()`         | Release the handle, then dispatch `onReleased`.                            |
| `Option.some(a)` to a different `Option.some(b)` | Release and dispatch `onReleased`, then acquire and dispatch `onAcquired`. |
| Structurally equal requirements                  | Keep the current handle.                                                   |

If acquisition fails, the runtime dispatches `onAcquireError` as a Message. The lifecycle keeps watching for the next requirements change, and the failed acquisition does not crash the application.

Register cleanup when each handle is created, before waiting for it to become ready. `Effect.acquireRelease` inside `acquire` ties that cleanup to the ManagedResource Scope, including when readiness fails, times out, or is interrupted. The entry's explicit `release` callback runs only after acquisition has returned a handle. On release, Foldkit runs that callback and every scoped finalizer before it clears the handle or dispatches `onReleased`. Cleanup defects are contained so the remaining cleanup and lifecycle transition can finish.

## Handler Contracts and Identity

### Handler Construction

The Runtime runs the attached handler generator once while building the application Layer and obtains the lifecycle handler. Return `{ acquire, release }` directly when construction has no dependencies. The constructor must not capture an active resource handle or the current requirements; each Model-scoped acquisition supplies those values. Model changes call the returned `acquire` and `release` functions without rebuilding the handler or its providers.

### External Host Handlers

Omit `handler` when an external host owns the lifecycle implementation. That entry has no `.layer`. List it in the completed Block's `hostHandlers`, then let the host call `block.provideHandlers(entry.toLayer(...))` before binding the feature. The method also constructs an alternative to an attached handler. `toLayer` accepts the implementation Effect constructor, and both `acquire` and `release` are required in either constructor.

### Names and Requirements

ManagedResource names are local to their named Block. Two features can both declare `ManageSession`; their owners keep the definitions distinct. Names must be unique within one owner, and composition derives readable paths for each Binding placement. Reusing one completed child at two placements shares its handler recipe while giving each occurrence a separate handle lifecycle.

A ManagedResource handler requirement contains its owned name, decoded acquire params, and resource value type. `FeatureComposition.prepareBlock` checks that each local requirement is supplied by `EffectsLayer` or declared in `hostHandlers`; `block.provideHandlers` checks an external provider against those declared contracts. Use `ManagedResource.HandlerOf<typeof managedResources.camera>` for an explicit requirement; the expanded form is `ManagedResource.Handler<Name, Params, Value>`, with all three arguments required.

Definitions created by different named Blocks receive different owned names even when their local names and protocols match. Each definition also retains a private runtime identity. An external implementation should use the declared entry's `toLayer` so it keeps that identity.

Within one Block Definition, each local lifecycle owner needs its own resource accessor. Completion rejects two local entries that share an accessor. Binding a completed child derives a placement-scoped accessor, so the same child can appear more than once with independent handles. A keyed Binding applies the same rule per active collection key.

The record key identifies the local lifecycle that Foldkit watches. The handler name identifies the acquire-and-release implementation and becomes part of its owned path. Use a verb-first name such as `ManageCamera` or `ManageChatSocket`. The registry key `layer` is reserved for the aggregate Layer, matching Subscriptions; use another key for a resource entry. An empty owned registry supplies `Layer.empty`.

Mixed attached and host-owned registries expose no aggregate `.layer`. Compose individual entry Layers when selecting a subset or supplying host-owned implementations. Create a standalone `ManageCameraLayer` binding only when that individual provider is intentionally public or independently reused outside `EffectsLayer` assembly.

The aggregate requires one closed owned registry with own string keys. It includes non-enumerable entries and preserves exact Layer output, error, and Service contracts. Open registries and alternatives with conflicting Layer contracts expose no aggregate Layer; select a concrete implementation or provide its entries explicitly. Registry construction and Layer composition remain passive.

### Execution Testing

In a whole-application execution test, keep the real lifecycle handler and replace the service it uses to open the camera, socket, worker, or other external capability. The test then covers the same Model-driven acquire, reacquire, release, error, and cleanup paths as production. Replacing the entire lifecycle handler can orchestrate those result paths, but it does not test the replaced acquire and release code.

## Accessing Managed Resources in Commands {#accessing-managed-resources}

Commands access the current handle through `.get`. Keep that lookup inside the returned Command function so it runs for each invocation; capturing `.get` while the handler Layer is built would read at application lifetime instead of the ManagedResource lifetime. Because the handle may be inactive, `.get` can fail with `ResourceNotAvailable`. The Command must turn that error into one of its declared result Messages.

::Snippet{name="managedResourcesCommand" label="ManagedResource Command"}

This is the usual Command error-to-Message boundary. The Model should gate the operation, for example by enabling `TakePhoto` only after `AcquiredCamera` has been received. The error handler remains a safety net if that Model logic is wrong or the handle disappears before the Command reads it.

### Operations Using a Handle

A handle lookup returns the currently acquired value. The Model may deactivate that resource while a Command waits. Deactivation does not automatically interrupt running Commands. Release callbacks and scoped finalizers should stop operations that require the live handle. When cancellation is application policy, use [Command interruption](/core/commands#interrupting-commands) and wait for its result before changing the resource's activation state.

## Building a Layer in acquire

When setup and teardown are already packaged as an Effect `Layer`, keep that lifecycle intact. `acquire` runs with the Managed Resource’s `Scope` in its context. `Layer.build` registers the Layer’s finalizers on that Scope, and the runtime closes it on release or reacquisition. Map the built Context down to the bare service value that Commands need.

::Snippet{name="managedResourcesLayer" label="Layer-backed ManagedResource"}

The resource accessor holds that bare value, so Commands read it through `.get` with no wrapper to destructure. Any finalizer registered during `acquire`, through either `Layer.build` or `Effect.addFinalizer`, runs when the handle is released. In that case the required explicit `release` can be `() => Effect.void`: scoped acquisition has already registered the real cleanup. The explicit callback runs first, followed by the Scope finalizers in Effect’s last-in-first-out order.

## Composing Child Blocks

A child Block defines its ManagedResources in its own Model and Message terms, with no knowledge of its parent. Create the registry through `FeatureDefinition.makeManagedResources` and include it in `FeatureComposition.prepareBlock`.

A Binding lifts the child's entries through its Model access and generated delivery. Include that Binding in the parent's `bindings` list, and the parent collects its entries under placement-qualified keys. `ApplicationComposition.prepareBlock({ init, update, view, ... })` packages the root's complete graph, and `Block.assemble(prepare)` finishes the root Block. Completion rejects one local resource accessor used by two lifecycle owners; changing record keys does not create another local handle. Repeating the completed child through separate Bindings is different: each placement receives its own scoped accessor and lifecycle.

### Optional Child Models

Use an exact `Option<ChildModel>` field for direct optional storage. `None` releases the child's resources without reading their requirements, and `Some` lets the child determine which resources it needs. A direct-field `presentWhen` predicate can also make the whole child absent without clearing its stored Model. Use [whole-variant Bindings](/core/block#whole-tagged-variants) for one complete tagged child member. Use explicit accessors for nested, wrapped, or custom storage; `None` from `read` has the same release behavior. `subscriptions.when` does not gate ManagedResources.

::Snippet{name="managedResourcesLift" label="Composing child ManagedResources"}

### Multiple Block Levels

`makeBinding` automates composition for static, optional, and keyed placements. Every active collection key receives an independent ManagedResource lifetime. [Subscription Organization](/patterns/subscription-organization) traces the equivalent leaf-to-root shape with Subscriptions.

:::Info{label="Layers vs Managed Resources"}
Use the root `ApplicationLayer` and the completed program's `provide` method for services that live with the runtime, such as an `RpcClient` or analytics client. The completed Block already carries its handler recipes. Use `managedResources` for handles whose lifetime follows the Model, such as camera streams, an `AudioContext`, or `WebSocket` connections. These are separate scopes: restarting or releasing a ManagedResource handle does not rebuild the app service or handler Layer that implements its lifecycle.
:::

Layers and Managed Resources cover app-lifetime services and Model-scoped handles. Unrecoverable errors in update, view, or a Command follow a different runtime path. The next page covers crash views.
