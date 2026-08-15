# Subscription Organization

## Overview

Once your app uses [Submodel](/core/submodel) and any of those Submodels need [Subscriptions](/core/subscriptions), a question shows up: where do the Subscription definitions live, and who translates the Stream of child Messages into the parent’s Message type?

This page documents the canonical answer. The shape mirrors how `update` and `view` compose across Submodels. `Subscription.lift` translates a child Submodel’s Stream into the parent’s Message type, and `Subscription.aggregate` combines that with any other Subscription records the level holds.

## The Composition Levels {#composition-levels}

Subscriptions compose in levels. Each level can declare its own Streams via `Subscription.make` and lift child Streams via `Subscription.lift` into the level’s Message type. The Stream emerging at the top is in the root’s Message type, ready for the runtime to dispatch through `update`.

```diagram
         ready for runtime processing
                      ↑
+--------------------------------------------+
| in subscription.ts (root)                  |
| lift to Message                            |
| via GotSettingsMessage                     |
| to declare                                 |
| Stream<Message>                            |
+--------------------------------------------+
                      ↑
+--------------------------------------------+
| in page/settings/subscription.ts           |
| lift to Settings.Message                   |
| via GotThemeMenuMessage                    |
| to declare                                 |
| Stream<Settings.Message>                   |
+--------------------------------------------+
                      ↑
+--------------------------------------------+
| in page/settings/themeMenu/subscription.ts |
| declare                                    |
| Stream<ThemeMenu.Message>                  |
+--------------------------------------------+
```

## The Composition Verbs {#composition-verbs}

Three verbs on the `Subscription` namespace do almost all of the composition work. Knowing which one applies at a given level is what makes a Subscription file easy to read.

| Verb                     | What it does                                                                                                                                                                                                        | When to reach for it                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Subscription.make`      | Declares a Subscriptions record at the current level. Each entry pairs a dependency field map with `modelToDependencies` and `dependenciesToStream` callbacks.                                                      | The current level has Subscriptions of its own to declare.                                     |
| `Subscription.lift`      | Lifts a child Submodel’s Subscriptions into the current level’s Model and Message via one `toChildModel` lens and one `toParentMessage` constructor. An optional `when` gates the whole record on the parent Model. | Embedding a child whose Subscriptions all share the same wrapper Message.                      |
| `Subscription.aggregate` | Combines two or more Subscriptions records into one. Throws at startup on duplicate keys instead of silently overriding.                                                                                            | A level combines multiple sources of Subscriptions (lifted children, inline entries, or both). |

## Organization Principles

### Submodel Cohesion

A Submodel’s Subscription wiring belongs next to its Model, Message, init, update, and view. Subscriptions that emit Messages for a Submodel are part of that Submodel’s set of concerns.

### One Wrap Per Level

A Subscription file produces Messages in its own Message type, and only that one. When a parent embeds it, the parent wraps the emitted Messages via `Subscription.lift`.

### Uniform Interface

Every Submodel that exposes Subscriptions exports one named value: a `subscriptions` record built via `Subscription.make`. A parent embeds it by combining it through `Subscription.aggregate` alongside its own Subscriptions. One record stays right even when the parent [gates](#gating) some of its entries and not others, because a gate attaches per entry at the lift. A Submodel never organizes its exports around its parent's conditions.

## Putting It Together

Here is one composition traced through every level: a leaf Submodel, a composing Submodel that embeds it, and a root that combines them.

### The Leaf Submodel {#leaf-submodel}

A leaf Submodel has no children with Subscriptions of their own. Its `subscription.ts` declares entries via `Subscription.make`:

::Snippet{name="subscriptionOrganizationChild" label="leaf Submodel Subscription file"}

### The Composing Submodel {#composing-submodel}

A Submodel that hosts Subscription-bearing children lifts each child via `Subscription.lift`, declares any local Subscriptions via `Subscription.make`, and combines them through `Subscription.aggregate`:

::Snippet{name="subscriptionOrganizationComposing" label="composing Submodel Subscription file"}

### The Root {#root}

The root `subscription.ts` uses the same shape as a composing Submodel. Its lifts target the root `Model` and `Message`:

::Snippet{name="subscriptionOrganizationRoot" label="root Subscription file"}

## Gating a Lifted Record {#gating}

A Submodel decides through its own `modelToDependencies` whether its Streams should run, but it can only read facts it holds. The route it sits behind is the common thing it cannot see: a page Submodel listening for key presses has no way to know the app is showing a different page.

The parent owns that half of the condition, so the gate lives on the parent’s `lift` call. `when` receives the **parent** Model, never the child’s, and a gated entry runs only while it returns `true`:

::Snippet{name="subscriptionOrganizationGate" label="route-gated lift"}

A closed gate is a teardown, not a pause. The entry’s Stream stops, and the child’s `modelToDependencies` does not run again until the parent reopens the gate, so child state that changes behind a closed gate causes no restarts.

`when` takes either shape. One predicate gates every entry in the record, which is the common case where the whole child answers to one parent condition. A map keyed by entry name gates entries individually, for a child whose Subscriptions answer to different conditions: a page that holds both a WebSocket stream and a keyboard listener wants the socket to survive navigation and the keys to stop at it. Entries the map omits are lifted ungated.

::Snippet{name="subscriptionOrganizationEntryGate" label="per-entry gated lift"}

Ownership splits cleanly. The parent writes `when` and answers it from parent state, and the child neither declares nor sees the gate: it keeps holding its own condition in `modelToDependencies`.

Lifts chain, so a gate attaches at whichever level knows the condition. A record lifted through two levels can be gated at the outer one on a fact only the root holds, and the level in between passes it along without knowing a gate is there. Gates at different levels compose: the entry runs only while every gate above it is open.
