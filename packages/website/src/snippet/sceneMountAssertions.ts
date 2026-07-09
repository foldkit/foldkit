import { Scene } from 'foldkit'

import { Listbox, Popover } from '@foldkit/ui'

// Single Mount. Open a popover, acknowledge its anchor mount.
Scene.click(Scene.role('button', { name: 'Open' }))
Scene.Mount.expectExact(Popover.AnchorPopover)
Scene.Mount.resolve(Popover.AnchorPopover, Popover.CompletedAnchorPopover())

// Multiple Mounts. Opening a modal Listbox renders both the items container
// (positioning) and a backdrop (portaled to body), so two Mounts fire.
Scene.click(Scene.role('button', { name: 'Pick a fruit' }))
Scene.Mount.expectExact(Listbox.AnchorListbox, Listbox.PortalListboxBackdrop)
Scene.Mount.resolveAll(
  [Listbox.AnchorListbox, Listbox.CompletedAnchorListbox()],
  [Listbox.PortalListboxBackdrop, Listbox.CompletedPortalListboxBackdrop()],
)

// Subset assertion. Use when you only care that a particular mount is pending.
Scene.Mount.expectHas(Listbox.AnchorListbox)

// Negative assertion. Useful before a transition that should produce no mounts.
Scene.Mount.expectNone()

// Acknowledge an unmount. Required for every Mount that fires and then
// unmounts during the scene, regardless of whether it was resolved first.
// The scene throws at the end for any unacknowledged unmount.
Scene.Mount.expectEnded(Popover.AnchorPopover)

// When the mount lives inside a child Submodel, resolve replays the
// Submodel boundary's own lift, so you pass the child's raw result Message.
Scene.Mount.resolve(Popover.AnchorPopover, Popover.CompletedAnchorPopover())
