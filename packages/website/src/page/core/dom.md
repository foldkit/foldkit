# Dom

## Overview

The `Dom` module packages common imperative browser operations as Effects for use inside your own [Commands](/core/commands). It covers focus, scrolling, programmatic clicks, dialogs, page scroll locks, inert isolation, element movement, and animation settling.

Use a Dom helper when a Message should cause a one-time DOM operation. For example: opening a dialog can return a Command that focuses its first input. The operation stays outside view, and its result still comes back through update as a Message.

Each helper exposes its failure type in the Effect channel. `Dom.focus` returns `Effect.Effect<void, ElementNotFound>`, while helpers without an expected application failure, such as `Dom.lockScroll`, return `Effect.Effect<void>`.

## Using Dom

Wrap the helper in a Command and map its success or failure into one of that Command's declared Messages.

::Snippet{name="domFocus" label="Dom.focus example"}

Most helpers that resolve a live element wait until Foldkit has committed the latest render before querying the DOM. This lets update return a Command for an element that the same Message just brought into the view. You do not need to add `Render.afterCommit` before `Dom.focus`, `Dom.showDialog`, `Dom.clickElement`, `Dom.scrollIntoView`, or `Dom.advanceFocus`.

Scrolling has two later-timing variants. `Dom.scrollIntoViewAfterPaint` waits until the target has been painted, which suits a route that just inserted a fragment target. `Dom.scrollIntoViewIfNotVisible` also waits through paint by default, but accepts `{ when: 'Commit' }` when the first visible frame should already be scrolled.

Cleanup and global-state helpers run immediately because they do not need a newly rendered target. These include `Dom.closeDialog`, `Dom.releaseDialogResources`, `Dom.lockScroll`, `Dom.unlockScroll`, and `Dom.restoreInert`. `Dom.waitForAnimationSettled` has its own timing contract: it checks the target's active Web Animations on the next animation frame and waits for them to settle.

:::Info{label="Use Render for custom timing"}
Dom helpers include the timing their operation needs. Reach for [Render](/core/render) directly when writing a custom Command or DOM-observing Subscription that must wait for a Foldkit commit or a browser paint.
:::

### Selector Failures

Helpers that require one matching element fail with `ElementNotFound` when the selector resolves to the wrong element type or no element at all:

- `Dom.focus`
- `Dom.showDialog`
- `Dom.closeDialog`
- `Dom.clickElement`
- `Dom.scrollIntoView`
- `Dom.scrollIntoViewAfterPaint`
- `Dom.scrollIntoViewIfNotVisible`
- `Dom.advanceFocus`

Catch a meaningful failure with `Effect.catch` and turn it into a Message. Use `Effect.ignore` only when a missing target is expected and does not matter, such as a stale focus Command after navigation.

## Full API Surface

The [Dom API reference](/api-reference/dom) lists every helper with its signature and an inline example.
