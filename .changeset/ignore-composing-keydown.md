---
foldkit: patch
---

`OnKeyDown`, `OnKeyDownPreventDefault`, `OnKeyDownSelf`, `OnKeyDownSelfPreventDefault`, and `OnKeyDownFocus` leave a keydown alone while an input method is composing. Enter can confirm a Japanese, Chinese, or Korean conversion. Before, a `Combobox` treated that Enter as a selection and called `preventDefault`, so the conversion never committed. `Subscription.keyBindings` already ignored a keydown with `isComposing` set. It now also ignores one some browsers report with `keyCode` 229 and `isComposing` false, so a binding does not call `preventDefault` on the key that confirms a conversion.
