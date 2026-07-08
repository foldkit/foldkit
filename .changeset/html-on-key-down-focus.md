---
'foldkit': minor
---

Add the `OnKeyDownFocus` HTML attribute. On a handled key it synchronously focuses the element matching a computed `focusSelector` and dispatches a Message, both inside the originating event handler; unhandled keys return `Option.none()` and keep default behavior. It is the keyboard companion to `OnClickFocus`, letting roving-tabindex widgets (radio groups, toolbars) move DOM focus onto the newly-active option from their own view handlers, so focus never has to travel through the parent's `update` as a command.
