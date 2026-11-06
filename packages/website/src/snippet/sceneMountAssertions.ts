import { Scene } from 'foldkit'

import { Listbox, Popover } from '@foldkit/ui'

const ListboxBlock = Listbox.makeBlock()
const ListboxAnchorListbox = Listbox.test.AnchorListbox
const ListboxPortalListboxBackdrop = Listbox.test.PortalListboxBackdrop
const PopoverAnchorPopover = Popover.test.AnchorPopover

// Single Mount. Open a popover, acknowledge its anchor mount.
Scene.click(Scene.role('button', { name: 'Open' }))
Scene.Mount.expectExact(PopoverAnchorPopover)
Scene.Mount.resolve(
  PopoverAnchorPopover,
  Popover.PopoverBlock.Message.CompletedAnchorPopover(),
)

// Multiple Mounts. Opening a modal Listbox renders both the items container
// (positioning) and a backdrop (portaled to body), so two Mounts fire.
Scene.click(Scene.role('button', { name: 'Pick a fruit' }))
Scene.Mount.expectExact(ListboxAnchorListbox, ListboxPortalListboxBackdrop)
Scene.Mount.resolveAll(
  [ListboxAnchorListbox, ListboxBlock.Message.CompletedAnchorListbox()],
  [
    ListboxPortalListboxBackdrop,
    ListboxBlock.Message.CompletedPortalListboxBackdrop(),
  ],
)

// Subset assertion. Use when you only care that a particular mount is pending.
Scene.Mount.expectHas(ListboxAnchorListbox)

// Negative assertion. Useful before a transition that should produce no mounts.
Scene.Mount.expectNone()

// Acknowledge an unmount. Required for every Mount that fires and then
// unmounts during the scene, regardless of whether it was resolved first.
// The scene throws at the end for any unacknowledged unmount.
Scene.Mount.expectEnded(PopoverAnchorPopover)

// When the mount lives inside a child Block, resolve replays the
// Block boundary's own lift, so you pass the child's raw result Message.
Scene.Mount.resolve(
  PopoverAnchorPopover,
  Popover.PopoverBlock.Message.CompletedAnchorPopover(),
)
