---
'foldkit': patch
---

Stop a render from crashing the app when it inserts a sibling before an element that a Mount moved out of its parent. An open `@foldkit/ui` Popover, Menu, Listbox, Combobox, Tooltip, or DatePicker panel is moved into a portal root by default, while its vnode stays among its siblings. A later render that added an element before the panel, for example a badge between the trigger and the panel, passed the panel to `insertBefore` as the reference node. The panel was no longer a child of that parent, so the browser threw `NotFoundError` and the runtime showed the crash screen.

The virtual DOM patch now checks that a child's element is still inside its parent. When it is not, the patch inserts before the next sibling that is still there, or at the end of the parent when there is none. A reorder of the siblings also leaves the moved element in the portal root instead of pulling it back.
