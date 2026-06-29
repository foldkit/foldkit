---
'foldkit': minor
'@foldkit/ui': minor
---

Add `h.OnUnmount(message)` and auto-release `Ui.Dialog` resources when the
dialog element unmounts.

`h.OnUnmount(message)` is a new Html attribute that dispatches a Message when
its element is removed from the DOM by a structural patch (a key change, a
parent re-render that drops it, route navigation away from its subtree). It
binds to snabbdom's `destroy` hook, so the resulting Message flows through
`update` like any other fact. When the element belongs to a Submodel, the
boundary wrapping chain is resolved eagerly at render time, so the Message
still reaches the parent even though the Submodel boundary is torn down in the
same patch. It is replay-safe: the runtime suppresses the dispatch during a
DevTools time-travel render, so scrubbing through history never re-runs the
cleanup.

`Ui.Dialog` uses this as a backstop. Previously, unmounting an open dialog
without a purposeful close (the classic case being navigation away from a
route-keyed subtree that contains it) left page scroll locked and the
focus-trap keyboard listener installed, and could leave the Model reading a
stale `isOpen: true`. The dialog now emits `Unmounted` on structural unmount,
which resets the Model to a clean closed state and runs a hygiene-only
`ReleaseDialogResources` Command (release scroll lock, restore focus, remove
the keydown listener). The view only attaches the backstop while the dialog is
visible (open or mid-leave), so navigating a page full of closed dialogs does
not flood the message log. This backstop is silent: it does not emit the
`Closed` OutMessage, run consumer close Commands, or play a leave animation. The
purposeful close path (Escape, backdrop, close button) is unchanged. The
cleanup is idempotent and releases the shared scroll lock exactly once, so a
normal close followed by an unmount never double-releases.

A new `Dom.releaseDialogResources(id)` Effect performs the idempotent,
hygiene-only release and is exported from `foldkit/dom`. It is addressed by the
dialog's id, not a selector, because the element is typically already gone from
the DOM by the time the backstop runs. Because this cleanup is now keyed by id
rather than by element, a dialog's id must be non-empty and unique within the
document.
