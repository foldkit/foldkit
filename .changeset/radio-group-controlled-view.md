---
'@foldkit/ui': minor
---

Make `RadioGroup` a stateless controlled render helper and remove the Submodel form. `RadioGroup.view` takes a `ViewConfig` (`id`, `selectedValue`, `options`, `onSelect`, `ariaLabel`, `orientation`, `toView`, plus the optional `isOptionDisabled`, `isDisabled`, and `name`) and dispatches the parent's own Message through `onSelect(value)`. The parent owns the selection, so there is no mirrored `selectedValue` to keep in sync. Moving focus onto the newly-selected option is the radio group's own concern now: it happens inside the component's click and keydown handlers (via `OnClickFocus` and the new `OnKeyDownFocus`), so the parent's `update` only stores the value. There is no focus command or acknowledgement to wire.

BREAKING: `RadioGroup.Model`, `init`, `update`, `select`, `create`, `reflectSelectedValue`, `FocusOption`, `CompletedFocusOption`, `SelectedOption`, `Selected`, `OutMessage`, `Message`, and the `InitConfig`/`ViewInputs` types are removed. Move each usage to a parent-owned selection field rendered with `RadioGroup.view`: store the value in your Model, handle the `onSelect` Message in `update`, and delete the `Got*` plumbing. A radio group is a select with different rendering, so it now sits with `Select`, `Input`, and `Textarea` as a controlled helper rather than a Submodel.
