import { Mount, click, role } from 'foldkit/scene'

import { Listbox, Popover } from '@foldkit/ui'

// Single Mount. Open a popover, acknowledge its anchor mount.
click(role('button', { name: 'Open' }))
Mount.expectExact(Popover.AnchorPopover)
Mount.resolve(Popover.AnchorPopover, Popover.Message.CompletedAnchorPopover())

// Multiple Mounts. Opening a modal Listbox renders both the items container
// (positioning) and a backdrop (portaled to body), so two Mounts fire.
click(role('button', { name: 'Pick a fruit' }))
Mount.expectExact(Listbox.AnchorListbox, Listbox.PortalListboxBackdrop)
Mount.resolveAll(
  [Listbox.AnchorListbox, Listbox.Message.CompletedAnchorListbox()],
  [
    Listbox.PortalListboxBackdrop,
    Listbox.Message.CompletedPortalListboxBackdrop(),
  ],
)

// Subset assertion. Use when you only care that a particular mount is pending.
Mount.expectHas(Listbox.AnchorListbox)

// Negative assertion. Useful before a transition that should produce no mounts.
Mount.expectNone()

// Acknowledge an unmount. Required for every Mount that fires and then
// unmounts during the scene, regardless of whether it was resolved first.
// The scene throws at the end for any unacknowledged unmount.
Mount.expectEnded(Popover.AnchorPopover)

// When the mount lives inside a child Submodel, resolve replays the
// Submodel boundary's own lift, so you pass the child's raw result Message.
Mount.resolve(Popover.AnchorPopover, Popover.Message.CompletedAnchorPopover())
