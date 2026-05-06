import { Scene, Ui } from 'foldkit'

// Single Mount. Open a popover, acknowledge its anchor mount.
Scene.click(Scene.role('button', { name: 'Open' }))
Scene.Mount.expectExact(Ui.Popover.AnchorPopover)
Scene.Mount.resolve(
  Ui.Popover.AnchorPopover,
  Ui.Popover.CompletedAnchorPopover(),
)

// Multiple Mounts. Opening a modal Listbox renders both the items container
// (positioning) and a backdrop (portaled to body), so two Mounts fire.
Scene.click(Scene.role('button', { name: 'Pick a fruit' }))
Scene.Mount.expectExact(
  Ui.Listbox.AnchorListbox,
  Ui.Listbox.PortalListboxBackdrop,
)
Scene.Mount.resolveAll(
  [Ui.Listbox.AnchorListbox, Ui.Listbox.CompletedAnchorListbox()],
  [
    Ui.Listbox.PortalListboxBackdrop,
    Ui.Listbox.CompletedPortalListboxBackdrop(),
  ],
)

// Subset assertion. Use when you only care that a particular mount is pending.
Scene.Mount.expectHas(Ui.Listbox.AnchorListbox)

// Negative assertion. Useful before a transition that should produce no mounts.
Scene.Mount.expectNone()

// Acknowledge an unmount. Required for every Mount that fires and then
// unmounts during the scene, regardless of whether it was resolved first.
// The scene throws at the end for any unacknowledged unmount.
Scene.Mount.expectEnded(Ui.Popover.AnchorPopover)

// Submodel lift. When the mount lives inside a child component, lift its
// result Message into the parent's universe (mirrors Scene.Command.resolve).
Scene.Mount.resolve(
  Ui.Popover.AnchorPopover,
  Ui.Popover.CompletedAnchorPopover(),
  message => GotPopoverMessage({ message }),
)
