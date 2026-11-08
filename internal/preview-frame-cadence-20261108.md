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
