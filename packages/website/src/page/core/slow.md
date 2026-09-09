# Slow Warnings

## Phase Budgets {#overview}

Slow synchronous work blocks the browser from responding to input or drawing the next frame. During development, Foldkit measures update, view, DOM patching, and Subscription dependency extraction so you can find which phase held the main thread.

Each phase has its own time budget. When work exceeds that budget, Foldkit logs a warning with the phase, duration, threshold, and attribution context. Configure `slow.onSlow` to send the same context to another destination.

Measurement runs only when Vite HMR is active by default. Set `show: 'Always'` to measure the selected phases in every environment.

The [Slow Warnings example](/example-apps/slow-warnings) intentionally trips each phase with the default thresholds, then records the actual callback payloads in the UI.

## Investigating a Warning {#when-to-act}

:::Info{label="Treat warnings as signals"}
A warning identifies work worth profiling. It does not prove that the application is slow for users. Do not disable the guardrail or add memoization only to clear the console.
:::

HMR, DevTools recording, breakpoints, and slow CI workers can all inflate development measurements. Reproduce the problem in a production build and use a profiler to confirm where the time goes.

Measure before and after the change. Keep the optimization only when the profile improves.

## Optimization playbook {#playbook}

The warning `_tag` identifies the phase to inspect. Start with the work attributed in the context, then choose a fix that preserves the application's architecture.

- **Render-only derived data:** If a value exists only to decide what to draw, compute it from view inputs. Put an expensive, stable subtree behind [createLazy](/core/view-memoization#create-lazy) or `createKeyedLazy`. Do not move the value into update only to avoid a View warning.
- **Slow View or Patch:** Start with stable keys for mapped lists and memoized boundaries around large regions. A lazy boundary helps only when its function and arguments often keep the same references between renders. If the inputs change every render, the cache misses every render.
- **Slow Update:** Start with the Message in the warning context. Move render-only calculations back to the view path. For work that changes application state, limit the calculation to Messages that can change its inputs.
- **Derived state in the Model:** Store a derived value only when it belongs with the Model and update can maintain it from the same Messages that change its source. Profiling should show that repeated calculation is the bottleneck.
- **Commands:** A Command runs after update, but synchronous CPU work inside it can still block the main thread. Use a Command when the work is an effect or a deliberately asynchronous computation.
- **Slow SubscriptionDependencies:** `modelToDependencies` should be a cheap projection from already-modeled fields to the values a stream reads. Avoid scanning, sorting, serializing, or building large dependency objects there.

## Measured phases {#phases}

Foldkit measures four phases independently:

- **`View`:** Builds the next VNode tree from the Model. The default budget is 16ms. The context includes the triggering Message as an `Option` because init has no Message.
- **`Update`:** Produces the next Model for a Message. The default budget is 4ms. The context includes the Message that ran.
- **`Patch`:** Diffs the VNode trees and applies changes to the DOM. The default budget is 8ms. The context includes the triggering Message as an `Option`.
- **`SubscriptionDependencies`:** Extracts one Subscription's dependencies after a Model change. The default budget is 2ms per Subscription. The context includes `subscriptionKey`.

## Configuration

Omit `slow` to measure all four phases during development with their default budgets. Pass `slow: false` to disable measurement.

Passing an object also measures every phase unless `measuredPhases` narrows the list. Use `thresholdOverrides` to replace individual budgets. An omitted override keeps the Foldkit default, and an override for an unmeasured phase has no effect.

`show` and `onSlow` apply to every measured phase. Passing `onSlow` replaces the default `console.warn`, so Foldkit will not also log phases that the callback ignores. The callback receives the full tagged `SlowContext` union even when `measuredPhases` selects a subset.

::Snippet{name="slowConfig" label="Configuring slow-phase warnings"}

When profiling confirms repeated work in View or Patch, the [view memoization](/core/view-memoization) page explains how `createLazy` and `createKeyedLazy` can skip stable subtrees.
