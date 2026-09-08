# Managed Resources

## Overview

Resources live for the entire runtime. Some stateful handles should exist only while the Model is in a particular state: a camera stream during a video call, a `WebSocket` while on a chat page, or a Web Worker pool during a computation. Managed Resources give those handles a Model-driven acquire and release lifecycle, using the same dependency-diffing engine as Subscriptions.

:::Info{label="The restaurant analogy"}
Resources are the kitchen equipment available all night. A Managed Resource is a specialty station set up only while the menu needs it. Changing the special tears down the old station and sets up the new one, just as changing camera requirements releases one stream and acquires another. A Command that asks for an inactive station receives `ResourceNotAvailable`.
:::

Define the handle’s identity with `ManagedResource.tag`, then wire its lifecycle with `ManagedResource.make`. The `modelToMaybeRequirements` function returns `Option.some(params)` while the handle should be active and `Option.none()` while it should be absent.

::Snippet{name="managedResources" label="Managed Resources example"}

The runtime compares the requirements after every Model change and performs the corresponding transition.

| Requirements transition                          | Runtime behavior                                                           |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `Option.none()` to `Option.some(params)`         | Acquire the handle, then dispatch `onAcquired`.                            |
| `Option.some(params)` to `Option.none()`         | Release the handle, then dispatch `onReleased`.                            |
| `Option.some(a)` to a different `Option.some(b)` | Release and dispatch `onReleased`, then acquire and dispatch `onAcquired`. |
| Structurally equal requirements                  | Keep the current handle.                                                   |

If acquisition fails, the runtime dispatches `onAcquireError` as a Message. The lifecycle keeps watching for the next requirements change, and the failed acquisition does not crash the application.

## Accessing Managed Resources in Commands {#accessing-managed-resources}

Commands access the current handle through `.get`. Because the handle may be inactive, `.get` can fail with `ResourceNotAvailable`. The Command must turn that error into one of its declared result Messages.

::Snippet{name="managedResourcesCommand" label="Managed Resource command example"}

This is the usual Command error-to-Message boundary. The Model should gate the operation, for example by enabling `TakePhoto` only after `AcquiredCamera` has been received. The error handler remains a safety net if that Model logic is wrong or the handle disappears before the Command reads it.

## Building a Layer in acquire

When setup and teardown are already packaged as an Effect `Layer`, keep that lifecycle intact. `acquire` runs with the Managed Resource’s `Scope` in its context. `Layer.build` registers the Layer’s finalizers on that Scope, and the runtime closes it on release or reacquisition. Map the built Context down to the bare service value that Commands need.

::Snippet{name="managedResourcesLayer" label="Layer-backed Managed Resource example"}

The resource tag holds that bare value, so Commands read it through `.get` with no wrapper to destructure. Any finalizer registered during `acquire`, through either `Layer.build` or `Effect.addFinalizer`, runs when the handle is released. In that case the explicit `release` can be `() => Effect.void`. The explicit callback runs first, followed by the Scope finalizers in Effect’s last-in-first-out order.

## Composing Child Submodels

A child Submodel defines its Managed Resources in its own Model and Message terms, with no knowledge of its parent. `ManagedResource.lift` translates the child record through a Model accessor and a Message wrapper, matching the shape of update delegation and `Subscription.lift`. `ManagedResource.aggregate` combines root and lifted child records into the single record the runtime config expects. Duplicate keys throw at startup instead of silently replacing an entry.

Unlike `Subscription.lift`, `toChildModel` returns an `Option`. A Managed Resource already uses `Option.none()` to mean “release”, so an optional child that is not mounted naturally follows the same path. Removing the child releases its handle.

::Snippet{name="managedResourcesLift" label="Managed Resources composition example"}

The same operations compose across every Submodel level: `make` at the owner, `lift` through each parent, and `aggregate` at the root. [Subscription Organization](/patterns/subscription-organization) traces that leaf-to-root shape with Subscriptions; the Managed Resource structure is identical.

:::Info{label="Resources vs Managed Resources"}
Use `resources` for services that live with the runtime, such as an `RpcClient` or analytics client. Use `managedResources` for handles whose lifetime follows the Model, such as camera streams, an `AudioContext`, or `WebSocket` connections.
:::

Resources and Managed Resources cover long-lived services and Model-scoped handles. Unrecoverable errors in update, view, or a Command follow a different runtime path. The next page covers crash views.
