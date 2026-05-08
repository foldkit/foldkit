---
'foldkit': patch
---

Fix DevTools clicks triggering app focus/blur messages. Clicking inside the DevTools panel previously caused the app's currently-focused element to blur, which would dispatch any blur-driven Messages the app had wired up (e.g. inputs that re-focus themselves on blur). In a typing-game-style app this made the message list unselectable: every click on a row immediately triggered a new blur Message, which was appended to history and selected automatically.

The fix attaches a capture-phase `pointerdown` listener on the DevTools shadow host that calls `preventDefault()` when an element outside the DevTools shadow is currently focused. Click handlers and DevTools' own programmatic focus management (`Dom.focus` Commands) still work normally; only the implicit "click-shifts-focus-to-the-clicked-element" browser default is suppressed.
