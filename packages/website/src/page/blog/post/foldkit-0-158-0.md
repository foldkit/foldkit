---
title: Foldkit 0.158.0
description: Machine gains shared transitions, read-only context, simpler update integration, and a guide to defining, testing, and analyzing your application's workflows.
date: 2026-09-04
coverImage: /blog/foldkit-0-158-0/cover.webp
coverImageAlt: Oversized rows of the word machine cropped against a black background, with one row in lime green and the others in light gray.
coverImageWidth: 3600
coverImageHeight: 2400
---

Foldkit 0.158.0 is out. This release focuses on Machine, Foldkit's experimental API for modeling workflows as typed transition tables.

Imagine a checkout where `ClickedContinue` moves Cart to Shipping, Shipping to Payment, and Payment to Review. A Machine collects those rules in one table so you can read the allowed transitions together, test them, and generate a diagram from the same definition.

Machine has been available for a while. This release makes it easier to use inside an application, and the new [Machine guide](/core/machine) covers when to reach for it, how to integrate it, and how to keep a larger flow readable. It still ships from `foldkit/experimental` while the API settles.

## Edges return update records

A Machine Edge now returns the same shape as update: `{ model }`, with `commands` when it has work to run.

Previously, `to` and `when` took a state builder and a separate Commands callback. In this example, both callbacks build the same order:

Before:

::Snippet{name="release0158EdgeBefore" label="Machine Edge before 0.158.0"}

After:

::Snippet{name="release0158EdgeAfter" label="Machine Edge in 0.158.0"}

The handler derives the order once and uses it for both the next state and the Command. The Command still executes through the Runtime after update returns.

This is a breaking change. Wrap existing state returns in `{ model }`, and move any separate Commands callback into the same handler's `commands` field.

Thank you to [@hdoro](https://github.com/hdoro) for suggesting that Machine Edges return Model and Commands together!

## Shared transitions

A checkout may allow cancellation from Cart, Shipping, Payment, and Review. Repeating that Edge under every state makes it harder to see which transitions actually differ.

`Machine.forStates(...).on(...)` now lets you declare the cancellation once in the Machine's `shared` array:

::Snippet{name="release0158SharedTransitions" label="shared checkout cancellation"}

The handler's `state` narrows to the selected variants, so it can read their common fields. A state-local transition overrides the shared default for the same Message. Overlapping shared declarations throw when the Machine is defined.

Shared transitions also appear in the Machine's graph analysis and Mermaid output.

## Folding a Machine into update

`Machine.fold` handles the work of reading a Machine state from the enclosing Model, running a transition, writing the next state back, and returning its Commands:

::Snippet{name="release0158MachineFold" label="folding checkout into the application Model"}

Call `foldCheckout(model, message)` from update, or use `foldCheckout(message)` as a Step in `Update.combine`. If the Machine exists only in some Model variants, `read` can return `Option.none()` elsewhere and the fold leaves the Model unchanged.

Machines can also declare a Schema for read-only context. For example, a checkout guard can consult current inventory held elsewhere in the Model without copying it into every checkout state. `Machine.fold` reads that context from the enclosing Model for each transition. Direct calls to `transition` and `step` must supply it too.

## Ignored Messages

`Machine.step` now explains why a Message produced no transition:

- `OutOfAlphabet`: the Message tag appears nowhere in the table.
- `NotApplicable`: the table knows the Message, but the current state has no Edge for it.
- `GuardsFellThrough`: every guard declined and there was no fallback.
- `ExplicitlyIgnored`: evaluation reached the new `ignore()` fallback.

Use `ignore()` at the end of a guard list when doing nothing is intentional. Tests and inspectors can distinguish that decision from guards that fell through without a fallback. Static analysis also reports Edges after `ignore()` as dead transitions.

If you construct or assert an `Ignored` result, add its required `reason` field. Exhaustive matches over `GuardedEdge`, `IgnoredReason`, and `DeadTransitionReason` also need to handle the new ignore cases.

## More in this release

- `Machine.define` accepts nested state unions without throwing at module load.
- Reachability analysis now excludes Edges shadowed by an earlier `otherwise`, and dead-transition reports list each Edge once.
- `Machine.StateTransitions` preserves state and Message narrowing when you extract a state's transition entry into a named binding.
- The docs have larger text, more space between sections, Inter for body text, and Paper Mono for code. Search is also available from the landing page.

The [Machine guide](/core/machine) walks through guards, context, shared transitions, update integration, graph analysis, and pure tests. The [state machine example](/example-apps/state-machine) lets you step through a checkout and inspect its transitions as you go.

The full [0.158.0 release notes](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.158.0) cover every package and migration detail.

Thanks to everyone building with Foldkit!

Devin
