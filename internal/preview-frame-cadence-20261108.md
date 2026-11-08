# Animation-frame cadence

## Behavior

A continuous animation-frame Subscription can update the Model on every tick
while the view renders only every other frame. A frame callback requested
inside another frame belongs to the next frame. The Subscription requests its
next tick before the Message reaches update, so that tick precedes the render
scheduled by the previous tick.

The current-source adaptation of
[#1921](https://github.com/foldkit/foldkit/pull/1921) arms the next render from a
task after the preceding frame. That callback follows the next Subscription
tick and renders its Model in the same frame. One unchanged callback ends the
arming sequence. It does not mark a commit pending or patch the DOM.

A frame also proves that the browser regained control after the Message
queue's time-budget yield. It can resume the deferred drain before rendering.
If that drain exceeds the budget again, rendering waits for the queue. The
current preview's occurrence admission checks and processing receipts stay on
the existing queue path.

This change addresses frame cadence. It is not evidence that update, view
construction or DOM patching takes less time, and it does not resolve the
ordinary rendering benchmark gap.

## Source and checks

The contribution by
[Tanner Scadden](https://github.com/Tanner-Scadden) was inspected at
`4ab23fa59d56449fc60dda0c5ea999a648dbca3e`, against main
`a471adb24d750ab9e8d8312edad53ff6f26d961b`. The adaptation starts from preview
follow-up `7cc7d90e68dc5a55b4765bbd7f0469b55cdd928f`; the older Message queue
implementation was not copied over the preview's delivery protections.

The three original cadence cases fail on the unchanged preview. The steady
tick produces `2, 4, 4, 6, 6, 8, 8, 10` instead of one increasing value per
frame. They pass with the adaptation. Added disposal cases cover an ordinary
pending render and an armed callback after a completed render.

A render failure also stops acquisition before another frame channel is
created. Its control first fails on the unguarded adaptation, then passes with
the post-render terminal-status check. This covers a crash occurring during
the render, after the callback's initial admission check.

Temporarily disabling deferred-drain resumption makes both new drain cases
fail at the expected processed-Message assertions. Restoring the implementation
passes them, including the case that defers again rather than painting a Model
behind the queue.

The package source check passes. All 40 Runtime test files complete with 352
passing tests and the existing one-test skip, including View Transitions,
commit waiters, crashes, replay and delivery receipts. This is the focused
verification checkpoint, not an exact-commit review, browser cadence capture,
combined performance measurement or full push gate.

After adding the post-render crash check, the four affected cadence, queue,
commit and View Transition files pass 51 tests. The final combined gate must
include the new crash case.

## Browser verification

A minimal public Block uses `Dom.animationFrameTicks` through an attached
Subscription, renders its Model's tick count and runs under `Runtime.embed`.
The browser records rendered counts and animation-frame timestamps. Network
responses and inline source maps authenticate the exact Renderer and Stream
modules loaded by the page. The app, driver and Stream hashes match, and both
captures use the same Chromium version. The fixed Renderer is the exact source
committed at `5c96e577ccbbceb160f500dc958ae542b29395d3`.

Across the final 60 observations, the unchanged `7cc7d90e68` baseline advances
by two ticks at each render. The fixed source advances by one. Source
registration order places the tick before the render, while the captured
timestamps show that both run in that frame. The full captures contain 150
ticks and 75 renders before the fix, and 77 ticks and 76 renders afterward; the
capture ends after its observation threshold, so those totals are not
elapsed-time ratios.

Both embedded programs dispose with no pending animation-frame callbacks.
Driver exit, server close and subsequent IPv4/IPv6 port checks pass. The
comparison helper accepts the authenticated pair and rejects the baseline
substituted for the fixed result at the one-tick assertion. It also verifies
retained served-module bytes and their source identities. A separate mutation
with an empty baseline delta series fails the symmetric 60-observation guard.

The [browser packet](preview-frame-cadence-20261108/measurements/browser/manifest.json)
preserves the code, raw captures, served modules, successful comparison, failed
comparison controls, Git-object source provenance and cleanup receipt with byte
counts and hashes. Served modules and text logs are compressed without changing
their original bytes. The comparison helper can read that retained packet
directly.

The initial setup attempt failed before browser launch because it treated
Playwright's CommonJS entry as an ES module with a named `chromium` export. Its
Vite server closed. That failed attempt and the preliminary captures are
preserved separately from the source-authenticated pair. No Runtime defect is
inferred from that setup error.

This development-source browser check establishes cadence and disposal. Its
instrumentation and timestamps do not measure production rendering time or
replace the separate ordinary benchmark.

## Feedback scope

The feedback refresh found
[#1923](https://github.com/foldkit/foldkit/pull/1923), a proposed fix for the
stable-release crash cleanup bug in
[#1902](https://github.com/foldkit/foldkit/issues/1902). Its application-scope
cleanup applies to lifecycle work, but the report is not a regression
introduced by Blocks or Layers.

The proposal also explicitly releases page-global DOM resources belonging to
other runtimes. A scoped element application can share a page with another
healthy application, so one application's crash is not enough to establish
that every runtime's dialogs and scroll locks should be released. That
ownership question needs review before adopting the contribution. This pass
does not mark the PR reviewed, implemented, merge-ready or approved deferred.
No external review or comment has been posted.
