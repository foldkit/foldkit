# Subscription Organization

## Overview

A Block owns the Subscriptions that produce its Messages. Its completed Block carries those registrations and their handler recipes. A parent Binding lifts them through the same Model accessor and generated delivery used for update and view.

This keeps one parent-child relationship in one place. The parent does not separately lift and aggregate a child's Subscription record, and the application entry does not import leaf Subscription handlers.

## Declare Local Subscriptions

Use the Block definition's `makeSubscriptions` helper. It fixes the Model and Message types while each entry keeps its named handler identity, dependency Schema, declared Messages, and attached Layer recipe.

Create one registry for all Subscriptions owned by that Block. Add entries to the same record as the feature grows. A substantial handler may move its Stream construction into a focused helper, but its entry stays in the owning registry. A child Block remains a distinct owner with its own registry.

::Snippet{name="subscriptionOrganizationChild" label="Block Subscription definitions"}

When Subscription declarations are split from Block assembly, that module exports the Block's `subscriptions` registry. In the child's Block assembly, pass `EffectsLayer: subscriptions.layer` to `FeatureComposition.prepareBlock`. When the feature has other local providers, compose their recipes and the registry Layer in `EffectsLayer`. A parent Binding contributes the completed child's handlers automatically.

Use `Subscription.aggregate` only where a graph, adapter, or test boundary must join independent Subscription records. It is not needed to rebuild one Block's registry from several same-owner records.

## Connect the Child Once

The parent binds the completed child and includes the Binding in its Composition:

::Snippet{name="subscriptionOrganizationComposing" label="Composing child Subscriptions through a Binding"}

The Binding derives three things from the same policy:

- `read` locates the child Model for update and every lifecycle.
- Generated delivery wraps view, Command, Subscription, Mount, and ManagedResource Messages with their captured Binding occurrence. Composition routes them through the same Binding.
- `placement` qualifies the child's runtime identities and registration keys.

Nested Blocks repeat the same pattern. By the time a Stream reaches the root, every emitted Message has been wrapped through each parent boundary.

## Install the Root

The Application Composition already contains the Subscription and handler graph. Its `prepareBlock` method produces the unfinished implementation assembly, and `Block.assemble(prepare)` finishes `ApplicationBlock`; `Program.make` adds the browser host configuration:

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

For an array storing child Models directly, use `ParentDefinition.makeBinding` with `field` and a string-valued `key`. The child Schema must expose its declared Struct fields. An exact array of closed Struct wrappers adds `childField`, whose required Schema has exactly the same decoded shape as the child Model; its distinct required `key` belongs to the wrapper. Custom writes, opaque, union, or open/index-signature wrappers, and non-array enumeration use `readAll`, function-valued `key`, `read`, and `writeAt`. The Binding declares storage, stable identity, and generated child delivery once. Every active key receives independent Stream scopes and its own gate evaluation.

Removing a key stops those Streams. Reusing the key later creates a fresh occurrence, so callbacks captured by the old occurrence cannot dispatch into the replacement.

## Ownership Rule

Put a Subscription in the lowest Block whose Messages it emits and whose Model controls its dependencies. Parent route policy belongs on the Binding. Shared event-source services belong in Effect Layers supplied at application assembly.
