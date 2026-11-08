---
'@foldkit/ui': patch
---

RadioGroup now moves the selection with all four arrow keys in both orientations. Down and Right select the next option, and Up and Left select the previous one, as the Keyboard Interaction table on the RadioGroup page already documented. Native radio buttons and the WAI-ARIA radio group pattern behave the same way.

Before, the group listened to one pair of keys chosen by `orientation`: a horizontal group ignored Up and Down, and a vertical group ignored Left and Right. A keyboard user who pressed Down in a row of options got no response.

`orientation` still sets `aria-orientation` on the group. Home, End, PageUp, PageDown, Space, wrapping, skipping disabled options, and read-only focus movement are unchanged. Tabs keeps its orientation-specific arrow keys.
