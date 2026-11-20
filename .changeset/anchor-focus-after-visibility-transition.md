---
'@foldkit/ui': patch
---

Anchored panels now receive focus when the page transitions `visibility`. On pages that use the common reduced-motion reset (`transition-duration: 0.01ms !important` on every element under `prefers-reduced-motion: reduce`), a DatePicker opened from the keyboard left focus on its trigger instead of moving it to the calendar grid, and a Popover with a `focusSelector` left focus on its trigger instead of moving it to that element. A Menu or Listbox opened with a pointer in Chromium missed focus intermittently, and any anchored panel that takes focus on open missed it when the page delays its `visibility` transition.

Before, the anchor made a single focus attempt one animation frame after it revealed the panel. Revealing the panel starts a `visibility` transition, and an element computes as hidden until the transition's first frame, or its delay, has passed. Each descendant starts its own transition only once its parent has changed, so a target a few levels below the panel stays hidden for a few frames. A hidden element ignores `focus()`, so the attempt did nothing.

The anchor now checks the focus target before focusing it. While the target is hidden and a `visibility` transition is running on it or one of its ancestors, it tries again on the next frame, and it drops the attempt if focus moves elsewhere during the wait. Pages without a `visibility` transition focus in the same frame as before. A target hidden for any other reason, or behind a paused transition, gets the same single attempt as before, as does an environment without `getAnimations` such as jsdom. Closing the panel cancels a pending attempt.
