# Render

## Overview

The `Render` module synchronizes an Effect with Foldkit's DOM commit and the browser's next paint. It exposes two Effects:

- `Render.afterCommit` resumes after Foldkit applies the pending VDOM patch.

- `Render.afterPaint` waits for that commit, then one more animation frame so the committed state has been displayed.

Yield either one inside a [Command](/core/commands) or [Subscription](/core/subscriptions). They do not render anything themselves. They mark the point after which a DOM read or write has the timing guarantee it needs.

The distinction matters because a Command can start after update but before Foldkit applies the render scheduled by the same Message. Reading the DOM immediately can still see the previous tree. `Render.afterCommit` waits for the actual pending patch, including a patch performed inside a View Transition.

When no Foldkit patch is pending, `Render.afterCommit` yields one animation frame. The same fallback applies when the Effect runs without a Foldkit runtime, such as in a standalone helper.

## When to Reach for It

Use `Render.afterCommit` before custom DOM work whose target was created, moved, or updated by the same Message. For example: measure a new panel with `getBoundingClientRect`, restore a custom scroll position, or start DOM observation from a Subscription after its target exists.

Use `Render.afterPaint` when the committed state must be visible before the next change. CSS transition orchestration is the usual case. The first state must reach the screen before update applies the transition's destination state, or the browser can collapse both into one frame and skip the animation.

:::Info{label="Prefer Dom helpers for common operations"}
The [Dom helpers](/core/dom) already wait for the commit or paint their operation requires. Use `Render` directly when implementing timing-sensitive DOM work that those helpers do not cover.
:::

::Snippet{name="renderBasic" label="Render examples"}

## Full API Surface

The [Render API reference](/api-reference/render) lists both Effects with their signatures and inline examples.
