---
title: Foldkit 0.160.0 and 0.161.0
description: Accessibility fixes across Foldkit UI, declarative keyboard shortcuts, helpers for initializing Submodels, stronger lint checks, and improved type inference.
date: 2026-09-17
coverImage: /blog/foldkit-0-161-0/cover.webp
coverImageAlt: Rows of 160 and 161 in cyan and yellow, joined by plus signs, with tilted coral and lime digits on a light gray background.
coverImageWidth: 3600
coverImageHeight: 2400
---

Foldkit 0.161.0 is out. This post also covers 0.160.0.

These releases:

- Improve accessibility across Foldkit UI.
- Add declarative keyboard shortcuts.
- Introduce helpers for initializing Submodels.
- Add lint checks that catch more mistakes at Submodel boundaries.
- Reduce the explicit type arguments needed for Subscriptions and ManagedResources.

## Accessibility improvements across Foldkit UI

Foldkit UI received an AI accessibility audit resulting in several fixes.

### Background isolation in modal Dialogs

A modal Dialog's backdrop blocked pointer interaction, and its focus trap kept Tab inside the Dialog, but a screen-reader user could still read past it into the page behind the backdrop.

Modal Dialogs now make background content inert and hide it from assistive technology, including new content mounted while the modal is open. Dialogs stacked above the modal remain available. Closing stacked Dialogs out of order also restores focus to an available target.

### Initially open Dialogs

A Dialog should provide the same focus management, scroll locking, and screen-reader isolation whether it starts open or opens later. Previously, Dialogs that started open skipped the normal opening setup. This release makes them run that setup too.

This changes initialization: `Dialog.init` always creates a closed Dialog and no longer accepts `isOpen`. Remove `isOpen: false` from existing calls. For an initially open Dialog, pass `Dialog.boot({ id })` to the new `Update.foldChildInit` helper to build the parent Model, lift the Commands, and handle the OutMessage. The [Dialog guide](/ui/dialog) covers the complete setup.

### Other accessibility fixes

- Controls emit `aria-controls` only while the referenced panel exists. Tabs that keep every panel mounted should pass `panelMount: 'All'`.
- A Combobox with no matching items no longer reports a nonexistent active option or expanded listbox. Its modal backdrop remains available for dismissal.
- Toast containers and entries use `div` elements so their live-region roles do not conflict with list semantics. Update CSS selectors or DOM queries that target the old `ol` and `li` wrappers.
- The website's scrollable tables and virtual lists are named and keyboard-focusable. The DragAndDrop demo announces keyboard interactions, and UI pages have improved text contrast.

Thank you to [@artile](https://github.com/artile) for the accessibility audit and follow-up reports, and to [@sandias42](https://github.com/sandias42) for reporting the Toast semantics issue in a downstream application!

## Declarative keyboard shortcuts

Prior to this release, adding keyboard shortcuts to a Foldkit application was cumbersome. You had to recognize key combinations, track sequences, manage timeouts, and avoid interrupting text input. These are details a good framework should handle for you.

In 0.161.0, `Subscription.keyboardShortcuts` handles that work from a binding table:

::Snippet{name="release0161KeyboardShortcuts" label="search and home shortcuts"}

`Mod` means Command on Apple platforms and Control elsewhere. An array describes an ordered sequence, so `['G', 'H']` means press G, then H. Incomplete sequences expire, and ambiguous bindings are rejected when the table is constructed.

Shortcuts ignore editable elements, IME composition, and held-key repeats by default. Here, `whileTyping: 'Allow'` lets the search shortcut work inside a text field. Matched presses cancel their browser default before the listener returns unless a binding sets `preventDefault: false`. The update function still decides how the application responds to each Message.

The [Subscriptions guide](/core/subscriptions#key-bindings) covers the options, and the [routing example](/example-apps/routing) demonstrates sequence navigation.

Thank you to [@artile](https://github.com/artile) for proposing and contributing the shortcut helper, and to [@hdoro](https://github.com/hdoro) for helping shape its API, including conditional shortcuts and key sequences!

## Canceling default browser actions

To reliably stop a key press from scrolling the page, cancel its default action inside the event listener.

0.160.0 added `Subscription.fromEventFilterMapPreventDefault`. When its `toMessage` callback returns `Option.some(message)`, the helper cancels the browser's default action and queues the Message before the listener returns. The Stream processes the Message after the event listener returns. Returning `Option.none()` leaves the default action alone. DragAndDrop now uses this helper so Tab does not move focus and Space and arrow keys do not scroll the page during a keyboard drag.

The [DOM events guide](/core/subscriptions#dom-events) covers event filtering and default cancellation.

## Initializing Submodels

Prior to this release, a parent's init function had to assemble child Submodels by hand: place each child's Model in the parent Model, lift the child's Commands, and handle its OutMessages.

Now, `Update.foldChildInit` keeps that work together. For example, a parent can initialize a Search Submodel and reuse the OutMessage fold it already calls from update:

::Snippet{name="release0161ChildInit" label="folding a child boot result into its parent"}

`toParentModel` constructs the parent Model before the OutMessage handler runs. The helper lifts the child's Commands and includes any Commands the handler returns.

For several sibling Submodels, `Update.foldChildInits` takes named results and their corresponding folds:

::Snippet{name="release0161ChildInits" label="initializing Search and Editor Submodels together"}

The parent Model is constructed once with both children. Each OutMessage handler receives the parent Model produced by the previous handler, so changes from Search's handler are still present when Editor's handler runs. Commands returned by the children and handlers still run independently.

Both helpers are optional additions. Existing initialization code remains valid. The [Update guide](/core/update#combining-independent-results) covers the full setup.

## Stronger lint checks

Updating a child Model directly can skip the child's validation, Commands, and OutMessages. Copying only the Model from a child result can discard its Commands and OutMessage. These are mistakes the linter should help you catch.

0.161.0 adds two recommended lint rules that use a parent's existing folds to identify its Submodels:

- [`no-direct-submodel-state-update`](/tooling/oxlint-plugin#no-direct-submodel-state-update) catches nested `evo` writes into a child Model that bypass the child's operations.
- [`require-fold-for-child-update-result`](/tooling/oxlint-plugin#require-fold-for-child-update-result) catches copying only a child result's `.model`, which can discard its Commands and OutMessage.

0.160.0 added six more recommended checks:

- [`acquire-release-constructs-in-acquire-body`](/tooling/oxlint-plugin#acquire-release-constructs-in-acquire-body) catches resources constructed before the acquire Effect runs, which can leak on interruption.
- [`prefer-option-over-nullable-in-model`](/tooling/oxlint-plugin#prefer-option-over-nullable-in-model) requires direct Model fields to represent absence with `Schema.Option`.
- [`no-route-query-constructor-default`](/tooling/oxlint-plugin#no-route-query-constructor-default) catches constructor defaults in `Route.query` that never run during decoding.
- [`no-switch-on-message-tag`](/tooling/oxlint-plugin#no-switch-on-message-tag) directs Message and state dispatch through exhaustive matchers.
- [`prefer-command-mapmessage`](/tooling/oxlint-plugin#prefer-command-mapmessage) requires Message lifts to use `Command.mapMessage` or `Command.mapMessages` so Story and Scene can recover the mapping.
- [`no-prevent-default-in-stream-operator`](/tooling/oxlint-plugin#no-prevent-default-in-stream-operator) flags cancellation in downstream Stream operators and points you to `Subscription.fromEventFilterMapPreventDefault`.

The [linting guide](/tooling/oxlint-plugin) explains the rules. Existing applications using the recommended preset may report new errors after upgrading.

## Less type annotation for Subscriptions and ManagedResources

If you're listening for `keydown` on `window`, Foldkit has enough information to know you'll receive a `KeyboardEvent`. You shouldn't have to spell that out.

DOM event helpers now infer that type from the target and event name.

Before:

::Snippet{name="release0161FromEventBefore" label="event types before 0.161.0"}

After:

::Snippet{name="release0161FromEventAfter" label="inferred event types in 0.161.0"}

Remove the old Event and Message type arguments from `fromEvent`, `fromEventFilterMap`, and `fromEventFilterMapPreventDefault`. Their named config types now take `<Target, Type, Message>` instead of `<Event, Message>`. Custom event targets can declare their event maps with `Subscription.TypedEventTarget`.

`Subscription.aggregate` and `ManagedResource.aggregate` also accept their records directly, inferring Model, Message, and service types. Replace `Subscription.aggregate<Model, Message>()(homeSubscriptions, roomSubscriptions)` with `Subscription.aggregate(homeSubscriptions, roomSubscriptions)`. You can still use the curried form to specify the Model and Message types explicitly.

## More in these releases

- DevTools now shows the destination path for Commands whose results reach a Submodel. For pending or interrupted Commands, the destination remains unresolved. The same information is available through DevTools MCP.
- Calendar formatting follows locale-defined date order. A German locale can render `15. Januar 2026` instead of `Januar 15, 2026`. Locales constructed field by field need four new format fields; the [Calendar guide](/ui/calendar#localization) covers the configuration and accessible labels.
- Disclosure's `animatePanel` accepts `peek`, a CSS height for a collapsed preview. The preview stays inert and hidden from assistive technology until opened.
- A new [LiveStore example](/example-apps/livestore) synchronizes tasks across browser tabs. Writes run through Commands, and a Subscription carries query results into the Model.

Thank you to [@filipfalcon](https://github.com/filipfalcon) for the Disclosure preview and Vite 8 work, and to [@artile](https://github.com/artile) for the lint rule proposals included in 0.160.0!

## Upgrading

Pin `effect` and `@effect/platform-browser` to `4.0.0-rc.115`. Foldkit requires the browser package again for page lifecycle cleanup. If you use `@effect/vitest`, its matching release requires Vitest 5; upgrade any `@vitest/*` packages together.

`@foldkit/vite-plugin` and `@foldkit/markdown` now require Vite 8. The updated UI, DevTools, and DevTools MCP packages require Foldkit 0.161.0 or newer.

The full [0.160.0](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.160.0) and [0.161.0](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.161.0) release notes cover every package and migration detail, including changes to custom Command history records and the return value of `Dom.showDialog`.

Thanks to everyone building with Foldkit!

Devin
