import { Scene, Ui } from 'foldkit'

// Single Mount. Open a popover, acknowledge its anchor mount.
Scene.click(Scene.role('button', { name: 'Open' }))
Scene.Mount.expectExact(Ui.Popover.PopoverAnchor)
Scene.Mount.resolve(Ui.Popover.PopoverAnchor, Ui.Popover.CompletedAnchorMount())

// Multiple Mounts. Opening a Listbox renders the items container, which
// fires both an anchor mount (positioning) and a focus mount (initial focus).
Scene.click(Scene.role('button', { name: 'Pick a fruit' }))
Scene.Mount.expectExact(
  Ui.Listbox.ListboxAnchor,
  Ui.Listbox.ListboxFocusItemsOnMount,
)
Scene.Mount.resolveAll(
  [Ui.Listbox.ListboxAnchor, Ui.Listbox.CompletedAnchorMount()],
  [
    Ui.Listbox.ListboxFocusItemsOnMount,
    Ui.Listbox.CompletedFocusItemsOnMount(),
  ],
)

// Subset assertion. Use when you only care that a particular mount is pending.
Scene.Mount.expectHas(Ui.Listbox.ListboxAnchor)

// Negative assertion. Useful before a transition that should produce no mounts.
Scene.Mount.expectNone()

// Submodel lift. When the mount lives inside a child component, lift its
// result Message into the parent's universe (mirrors Scene.Command.resolve).
Scene.Mount.resolve(
  Ui.Popover.PopoverAnchor,
  Ui.Popover.CompletedAnchorMount(),
  message => GotPopoverMessage({ message }),
)
