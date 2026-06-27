---
'foldkit': minor
---

Add `OnKeyDownSelf` and `OnKeyDownSelfPreventDefault` to `foldkit/html`. They
mirror `OnKeyDown` and `OnKeyDownPreventDefault` but fire only when the keydown
targets the element itself (`event.target === event.currentTarget`) rather than
bubbling up from a descendant. A composite widget that owns the keyboard for a
region but embeds interactive children inside it can now ignore the children's
keystrokes declaratively. For a contenteditable host the focused element is the
host itself, so its own typing fires the handler while keys typed in an embedded
input bubble through untouched.
