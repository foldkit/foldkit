# Re-render Outlines

## What the overlay shows {#overview}

Re-render outlines draw a fading rectangle around each part of the view that changed on the last render. They show where Foldkit built or patched DOM, not which props changed.

The overlay tracks three kinds of boundaries:

- Submodel slots when the child Model input changed.
- Lazy regions when `createLazy` or `createKeyedLazy` ran because the cache missed.
- Patched VNodes when the differ updated a VNode that owns DOM.

The fading overlays, scroll tracking, and warming colors behave like [React Scan](https://react-scan.com) if you're already familiar with it.

## Enabling outlines {#enabling}

Open DevTools, go to Settings, and turn on Highlight re-renders. To control outlines programmatically, set `window.__foldkitOutlinesEnabled` on `window`.

Foldkit does no outline work while the toggle is off. In production the overlay is absent by default. See [DevTools](/devtools) for including it with `show: 'Always'`.

## Reading the overlay {#reading}

Each label names the boundary that rendered. When the render had a cause, the label includes the dispatching Message `_tag`. When several boundaries share one rectangle, their labels appear together on one outline.

A lazy region that stays silent on repeated Messages is working as intended. Outlines appear only on cache misses.

If no boundary produced a rectangle, the overlay draws a fallback rectangle around the app root so you still see that a render happened.

## Making outlines useful {#making-useful}

The [Re-render Outlines example](/example-apps/re-render-outlines) contrasts memoized and unmemoized rendering. Toggle outlines in DevTools Settings and dispatch Messages to see which boundaries flash.

Use outlines to find over-rendering before you add memoization. If a large subtree flashes on every Message but its inputs rarely change, try `createLazy` or `createKeyedLazy`. See [View Memoization](/core/view-memoization) for when each helper applies.

Follow the [Performance](/faq/performance) toolkit in order: [Slow Warnings](/core/slow-warnings), then memoization, then [keying](/best-practices/keying), then derived fields on the Model when memoization cannot cover it. Outlines help you pick the step. A warm outline over an entire list points to per-item memoization. A cool outline that flashes once per route change is usually not worth optimizing.

## Relation to React Scan {#react-scan}

Re-render outlines need no code changes. Turn on the toggle and the overlay appears.

[React Scan](https://react-scan.com) instruments React fibers to show which components rendered and which props changed. Foldkit outlines track Submodel slots, lazy cache misses, and patched VNodes. Those are the units Foldkit diffs and patches.

Use outlines to reason about structure. A Submodel flash means the child Model changed. A lazy flash means the view function ran because the cache missed. A patched VNode flash means the differ touched DOM. Reach for memoization or keying where the flashes show waste.
