# Managed Resources

## Overview

Layers provided to the application live for the entire runtime. Some stateful handles should exist only while the Model is in a particular state: a camera stream during a video call, a `WebSocket` while on a chat page, or a Web Worker pool during a computation. Managed Resources give those handles a Model-driven acquire and release lifecycle, using the same dependency-diffing engine as Subscriptions.

:::Info{label="The restaurant analogy"}
Application-scoped Layers are the kitchen equipment available all night. A Managed Resource is a specialty station set up only while the menu needs it. Changing the special tears down the old station and sets up the new one, just as changing camera requirements releases one stream and acquires another. A Command that asks for an inactive station receives `ResourceNotAvailable`.
:::

Define the handle’s identity with `ManagedResource.tag`, then wire its lifecycle with `ManagedResource.make`. The `modelToMaybeRequirements` function returns `Option.some(params)` while the handle should be active and `Option.none()` while it should be absent.

Give each entry a stable handler name and supply its acquire and release functions with `entry.toLayer(Effect<handler>)`. The `managedResources` record stays in the application: it declares the Model condition, the handle identity, and the lifecycle Messages. `Application.provide` supplies the handler Layer. The Layer lasts for the application lifetime; the handle it acquires still starts and stops according to the Model.

Calling `toLayer` creates a Layer recipe. The Runtime runs its Effect constructor once while building the application Layer and obtains the lifecycle handler. Use `Effect.succeed({ acquire, release })` when construction has no dependencies. The constructor must not capture an active resource handle or the current requirements; each Model-scoped acquisition supplies those values. Model changes call the returned `acquire` and `release` functions without rebuilding the handler or its providers.

Distinct ManagedResource definitions within one application need distinct handler names. A lifted use of the same definition can share its handler Layer. `Application.make` rejects duplicate names from different definitions.

Each registered `ManagedResource.tag` key has one handle accessor and one lifecycle owner. `Application.make` and `Application.makeElement` reject that tag key under two record keys, including separately created tags whose key strings match. Give independent resource instances distinct tag keys. Lifting an entry through its parents preserves its existing handle identity.

The record key identifies the lifecycle that Foldkit watches. The handler name identifies the acquire-and-release implementation supplied by a Layer. Use a verb-first name such as `ManageCamera` or `ManageChatSocket`, name its production Layer `ManageCameraLayer` or `ManageChatSocketLayer`, and include that Layer in the feature's `EffectsLayer` export.

::Snippet{name="managedResources" label="Camera ManagedResource lifecycle"}

The runtime compares the requirements after every Model change and performs the corresponding transition.

| Requirements transition                          | Runtime behavior                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `Option.none()` to `Option.some(params)`         | Acquire the handle, then dispatch `onAcquired`.                            |
| `Option.some(params)` to `Option.none()`         | Release the handle, then dispatch `onReleased`.                            |
| `Option.some(a)` to a different `Option.some(b)` | Release and dispatch `onReleased`, then acquire and dispatch `onAcquired`. |
| Structurally equal requirements                  | Keep the current handle.                                                   |

If acquisition fails, the runtime dispatches `onAcquireError` as a Message. The lifecycle keeps watching for the next requirements change, and the failed acquisition does not crash the application.

Register cleanup when each handle is created, before waiting for it to become ready. `Effect.acquireRelease` inside `acquire` ties that cleanup to the ManagedResource Scope, including when readiness fails, times out, or is interrupted. The entry's explicit `release` callback runs only after acquisition has returned a handle.

In a whole-application execution test, keep the real lifecycle handler and replace the service it uses to open the camera, socket, worker, or other external capability. The test then covers the same Model-driven acquire, reacquire, release, error, and cleanup paths as production. Replacing the entire lifecycle handler can orchestrate those result paths, but it does not test the replaced acquire and release code.

## Accessing Managed Resources in Commands {#accessing-managed-resources}

Commands access the current handle through `.get`. Because the handle may be inactive, `.get` can fail with `ResourceNotAvailable`. The Command must turn that error into one of its declared result Messages.

::Snippet{name="managedResourcesCommand" label="ManagedResource Command"}

This is the usual Command error-to-Message boundary. The Model should gate the operation, for example by enabling `TakePhoto` only after `AcquiredCamera` has been received. The error handler remains a safety net if that Model logic is wrong or the handle disappears before the Command reads it.

## Building a Layer in acquire

When setup and teardown are already packaged as an Effect `Layer`, keep that lifecycle intact. `acquire` runs with the Managed Resource’s `Scope` in its context. `Layer.build` registers the Layer’s finalizers on that Scope, and the runtime closes it on release or reacquisition. Map the built Context down to the bare service value that Commands need.

::Snippet{name="managedResourcesLayer" label="Layer-backed ManagedResource"}

The resource tag holds that bare value, so Commands read it through `.get` with no wrapper to destructure. Any finalizer registered during `acquire`, through either `Layer.build` or `Effect.addFinalizer`, runs when the handle is released. In that case the explicit `release` can be `() => Effect.void`. The explicit callback runs first, followed by the Scope finalizers in Effect’s last-in-first-out order.

## Composing Child Submodels

A child Submodel defines its Managed Resources in its own Model and Message terms, with no knowledge of its parent. `ManagedResource.lift` translates the child record through a Model accessor and a Message wrapper, matching the shape of update delegation and `Subscription.lift`. `ManagedResource.aggregate` combines root and lifted child records into the single record the runtime config expects. Duplicate keys throw at startup instead of silently replacing an entry.

`read` returns an `Option` of the child Model. Returning `None` releases the child’s resources without reading their requirements. Returning `Some` lets the child determine which resources it needs. Wrap an always-present child in `Option.some`.

::Snippet{name="managedResourcesLift" label="Composing child ManagedResources"}

The same operations compose across every Submodel level: `make` at the owner, `lift` through each parent, and `aggregate` at the root. [Subscription Organization](/patterns/subscription-organization) traces that leaf-to-root shape with Subscriptions; the Managed Resource structure is identical.

:::Info{label="Layers vs Managed Resources"}
Use `Application.provide` for services and handler accessors that live with the runtime, such as an `RpcClient` or analytics client. Use `managedResources` for handles whose lifetime follows the Model, such as camera streams, an `AudioContext`, or `WebSocket` connections. These are separate scopes: restarting or releasing a ManagedResource handle does not rebuild the app service or handler Layer that implements its lifecycle.
:::

Layers and Managed Resources cover app-lifetime services and Model-scoped handles. Unrecoverable errors in update, view, or a Command follow a different runtime path. The next page covers crash views.
