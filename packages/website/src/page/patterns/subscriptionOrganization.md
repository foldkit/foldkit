# Subscription Organization

## Overview

A Block owns the Subscriptions that produce its Messages. It returns them from its constructor as `stream` and `subscriptions`, beside the update handlers that receive their Messages. Each instance runs its own Streams, computed from its own Model.

Nothing above the Block collects them. A parent does not lift a child's Subscriptions, the root does not register a combined record, and the application entry does not import Stream handlers. The parent controls a child's Streams through the same two tools it uses for everything else about the child:

- Whether the instance is in the parent's Model. An instance's Streams run while it is in the Model and stop when it leaves.
- The Messages the parent sends it. A Message can change the child Model that an entry's `dependencies` read.

[Subscriptions](/core/subscriptions) covers `stream`, `subscriptions`, and dependency comparison. This page covers where those declarations live as an application grows.

## Declare Subscriptions in the Owning Block

Put a Subscription in the Block whose Messages it emits and whose Model decides when it runs. A ThemeMenu that closes on Escape owns that listener, because `PressedEscape` is its Message and `isOpen` is its state.

When the Stream construction grows, extract it into a named function in the Block's file, above the `Live` Layer. The function takes the entry's dependencies and returns the Stream. The entry stays in the constructor, next to the update handlers for the Messages it produces, and passes the function as its `stream`:

::Snippet{name="subscriptionOrganizationThemeMenu" label="ThemeMenu declaring its escapePresses entry"}

Keep every entry for one Block in that Block's `subscriptions` record. A child Block is a separate owner and declares its own.

## Control a Child's Streams from the Parent

A child's `dependencies` see only the child's Model. When a parent-owned fact, such as the active Route or an open dialog, decides whether a child's Stream runs, the parent has two ways to express it.

### Hold the Instance Only While It Should Run

If the child's state is not needed while its Streams are stopped, put the instance in the Model only while it should run. This application holds ThemeMenu inside the `Settings` page variant. Navigating to `Home` takes the instance out of the Model, which stops its Streams and discards its state:

::Snippet{name="subscriptionOrganizationPresence" label="ThemeMenu living in the Settings page"}

Navigating back to `Settings` constructs ThemeMenu fresh, closed, with its `escapePresses` entry computed from the new Model. An instance in an `Option` field behaves the same way.

### Inform the Child

If the child's state must survive while one of its Streams pauses, keep the instance in the Model and tell it about the parent-owned fact. The child records the fact in its Model, and the entry's `dependencies` read it.

This Room listens to server events for as long as it exists, and to key presses only while no dialog covers it. The server events are its `stream`. The key presses are a `subscriptions` entry that depends on `isDialogOpen`:

::Snippet{name="subscriptionOrganizationRoom" label="Room gating keyPresses on isDialogOpen"}

Lobby owns the help dialog. When the dialog opens or closes, it sends Room `InformedOfDialogChange`:

::Snippet{name="subscriptionOrganizationInform" label="Lobby informing Room about its dialog"}

Room's update records the fact, its `keyPresses` dependencies change, and the Runtime restarts the entry with `Stream.empty` while the dialog is open. The `stream` of server events keeps running throughout. [Informing Blocks](/patterns/informing-blocks) covers this Message pattern in depth.

## Keyed Instances

Instances created with `Child.each` each run their own `stream` and `subscriptions`. Ten rows run ten independent sets of Streams, each gated by its own Model.

Removing an instance from the collection stops its Streams. Adding an instance with the same key later constructs it fresh, so a Stream started by the removed instance never delivers Messages to the new one.

## Services for Streams

When a Stream needs a shared event source, such as a connection pool or a clock, make it an Effect service. Yield the service in the constructor and close over it in the entry's `stream` function. The Block's Layer then requires the service, and the program Layer provides it once for every Block that uses it. [Layers](/core/layers) covers that wiring.
