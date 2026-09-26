---
'@foldkit/ui': minor
---

An anchored panel inside a `<dialog>` is now portaled into that dialog instead of `document.body`. Before, a Listbox, Combobox, Menu, Popover, Tooltip, or DatePicker opened inside a Dialog was drawn behind the dialog, and the Dialog's modal isolation made it inert, so it could not be clicked, focused, or read by a screen reader. The panel now renders above the dialog's content and stays interactive, and a scrolling dialog panel no longer clips it. The `anchor: { portal: false }` workaround is no longer needed inside a dialog.

`anchorSetup` and `portalToContainingRoot` put the panel in a div marked `data-foldkit-portal-root`, appended as the dialog's last child and removed again once it is empty. Outside a dialog, elements still go to the shared `foldkit-portal-root` div.

The new `portalBackdrop` places a click-outside backdrop. Outside a dialog, it does what `portalToContainingRoot` does. Inside a dialog, it moves the backdrop to directly before the element it was rendered in, the positioned wrapper that holds the trigger. The backdrop covers the rest of the dialog, so a click elsewhere in the dialog closes only the overlay, and the trigger stays above it, so a click in a Combobox input keeps the list open. Listbox, Menu, Combobox, and Popover use it for their backdrops, and the wrapper must be positioned, for example `position: relative`, as it already had to be outside a dialog.

This breaks two patterns inside a dialog. In both, the backdrop now covers the trigger, so a click in a Combobox input closes the list instead of placing the cursor.

- A component whose trigger does not paint in a positioned layer above its backdrop. The Dialog docs used to show a Combobox with `anchor: { portal: false }` and no wrapper class. Its backdrop went behind the dialog, where it did nothing, so the input stayed clickable. Now the backdrop sits before the wrapper and paints over the input. Give the wrapper `position: relative`, for example with the Combobox `className` view input, and drop `portal: false`. Listbox, Menu, and Popover already position their trigger while open.
- A custom component that portals its own backdrop with `portalToContainingRoot`. That backdrop is now appended after the dialog's content, where it covers the trigger. Switch those calls to `portalBackdrop`:

```ts
import { portalBackdrop } from '@foldkit/ui/anchor'

Effect.acquireRelease(
  Effect.sync(() => portalBackdrop(element)),
  cleanup => Effect.sync(cleanup),
)
```

The Listbox and Menu items panels now have `tabindex="-1"` instead of `tabindex="0"`. They are focused from code when they open, so this changes nothing there, but Tab and Shift+Tab no longer land on an open panel. Inside a dialog, the panel sits after the dialog's content, and the Dialog's focus trap would otherwise treat it as the dialog's last focusable element.
