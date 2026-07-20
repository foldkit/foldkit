---
'foldkit': patch
---

Fix two crash-handling gaps in the runtime. A Command forked by a Message processed on the same synchronous stack just before a crash no longer runs its effect behind the crash view: the deferred fork now checks the crash flag as well as the disposal flag, so a side effect never executes once the crash view is shown. A defect in a ManagedResource's `modelToMaybeRequirements` or its equivalence now surfaces as the crash view instead of dying silently in a detached fiber, matching how Subscriptions already handle the same failure.
