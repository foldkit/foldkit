# Subscription Organization

## Overview

A Block owns the Subscriptions that produce its Messages. Its completed Block carries those registrations and their handler recipes. A parent Binding lifts them through the same Model accessor and Message wrapper used for update and view.

This keeps one parent-child relationship in one place. The parent does not separately lift and aggregate a child's Subscription record, and the application entry does not import leaf Subscription handlers.

## Declare Local Subscriptions

Use the Block definition's `subscriptions` helper. It fixes the Model and Message types while each entry keeps its named handler identity, dependency Schema, declared Messages, and attached Layer recipe.

::Snippet{name="subscriptionOrganizationChild" label="Block Subscription definitions"}

Compose the attached entry recipes in the feature's local `EffectsLayer`. Pass that bundle to `FeatureComposition.makeBlock`. A parent Binding contributes it automatically.

## Connect the Child Once

The parent binds the completed child and includes the Binding in its Composition:

::Snippet{name="subscriptionOrganizationComposing" label="Composing child Subscriptions through a Binding"}

The Binding derives three things from the same policy:

- `read` locates the child Model for update and every lifecycle.
- `parentMessage` wraps update, Command, Subscription, Mount, and ManagedResource Messages, and supplies the canonical unkeyed route back through the Binding.
- `placement` qualifies the child's runtime identities and registration keys.

Nested Blocks repeat the same pattern. By the time a Stream reaches the root, every emitted Message has been wrapped through each parent boundary.

## Install the Root

The Application Composition already contains the Subscription and handler graph. Its owned `makeApplication` method completes the browser program with the implementation:

::Snippet{name="subscriptionOrganizationRoot" label="Installing the root Subscription graph"}

The root `ApplicationLayer` supplies ordinary services required by the handlers. It does not merge the feature `EffectsLayer` bundles again.

## Optional Children

Return `Some(child)` from `read` while the child exists and `None` while it is absent. Foldkit stops every Stream for the absent occurrence and skips its dependency functions.

::Snippet{name="subscriptionOrganizationOptional" label="Reading an optional child Model"}

When that child reappears, its Streams start in a new occurrence scope.

## Parent-owned Gates {#gating}

A child expresses conditions from its own Model through `modelToDependencies` and its Stream. It cannot see parent-owned state such as the active Route. Put that policy on the Binding.

### Gate the whole child record

::Snippet{name="subscriptionOrganizationGate" label="Route-gated child Subscriptions"}

The gate controls Stream lifetime only. It does not make the child Model absent and does not prevent `binding.fold` from running.

### Gate named entries

Use a record when some entries remain active. This Room keeps its Binding Stream alive while gating only its keyboard listener:

::Snippet{name="subscriptionOrganizationEntryGate" label="Per-entry Subscription gate"}

An omitted entry has no additional parent gate. It still stops when `read` returns `None`.

## Keyed Children

For an array storing child Models directly, use `Parent.bindChild` with `field`, a string-valued `key`, and `toParentMessage`. The child Schema must expose its declared Struct fields. An exact array of closed Struct wrappers adds `childField`, whose required Schema has exactly the same decoded shape as the child Model; its distinct required `key` belongs to the wrapper. Custom writes, opaque, union, or open/index-signature wrappers, and non-array enumeration use `readAll`, function-valued `key`, `read`, and `writeAt`. The Binding declares storage, stable identity, and parent Message routing once. Every active key receives independent Stream scopes and its own gate evaluation.

Removing a key stops those Streams. Reusing the key later creates a fresh occurrence, so callbacks captured by the old occurrence cannot dispatch into the replacement.

## Ownership Rule

Put a Subscription in the lowest Block whose Messages it emits and whose Model controls its dependencies. Parent route policy belongs on the Binding. Shared event-source services belong in Effect Layers supplied at application assembly.
