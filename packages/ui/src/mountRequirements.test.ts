import { Schema } from 'effect'
import type { ChildAttribute } from 'foldkit/html'
import type * as Mount from 'foldkit/mount'
import { expectTypeOf, it } from 'vitest'

import * as Combobox from './combobox/public.js'
import * as ComboboxInternal from './combobox/shared.js'
import * as DialogInternal from './dialog/block.js'
import * as Dialog from './dialog/public.js'
import * as Listbox from './listbox/public.js'
import * as ListboxInternal from './listbox/shared.js'
import * as MenuInternal from './menu/menu.js'
import * as Menu from './menu/public.js'
import * as PopoverInternal from './popover/block.js'
import * as Popover from './popover/public.js'
import * as TooltipInternal from './tooltip/block.js'
import * as Tooltip from './tooltip/public.js'
import * as VirtualList from './virtualList/public.js'
import * as VirtualListInternal from './virtualList/virtualList.js'

const TestCombobox = Combobox.makeBlock(Schema.String)
const TestListbox = Listbox.makeBlock()
const TestMenu = Menu.makeBlock()
const TestVirtualList = VirtualList.makeBlock<string>()

it('declares each component Mount registry on its Block class', () => {
  expectTypeOf<
    Mount.RequirementsOf<typeof Dialog.Dialog.Mount>
  >().toEqualTypeOf<Mount.RequirementsOf<typeof DialogInternal.mounts>>()
  expectTypeOf<
    Mount.RequirementsOf<typeof Popover.Popover.Mount>
  >().toEqualTypeOf<Mount.RequirementsOf<typeof PopoverInternal.mounts>>()
  expectTypeOf<
    Mount.RequirementsOf<typeof Tooltip.Tooltip.Mount>
  >().toEqualTypeOf<Mount.RequirementsOf<typeof TooltipInternal.mounts>>()
  expectTypeOf<
    Mount.RequirementsOf<typeof TestVirtualList.Mount>
  >().toEqualTypeOf<
    Mount.RequirementsOf<typeof VirtualListInternal.ObserveVirtualList>
  >()
  expectTypeOf<Mount.RequirementsOf<typeof TestCombobox.Mount>>().toEqualTypeOf<
    Mount.RequirementsOf<typeof ComboboxInternal.mounts>
  >()
  expectTypeOf<Mount.RequirementsOf<typeof TestListbox.Mount>>().toEqualTypeOf<
    Mount.RequirementsOf<typeof ListboxInternal.mounts>
  >()
  expectTypeOf<Mount.RequirementsOf<typeof TestMenu.Mount>>().toEqualTypeOf<
    Mount.RequirementsOf<typeof MenuInternal.mounts>
  >()
})

it('marks only the slot groups that carry Mount attributes', () => {
  expectTypeOf<Dialog.RenderInfo['dialog']>().toEqualTypeOf<
    ReadonlyArray<
      ChildAttribute<Mount.RequirementsOf<typeof DialogInternal.mounts>>
    >
  >()
  expectTypeOf<Dialog.RenderInfo['panel']>().toEqualTypeOf<
    ReadonlyArray<ChildAttribute>
  >()

  expectTypeOf<Popover.RenderInfo['panel']>().toEqualTypeOf<
    ReadonlyArray<
      ChildAttribute<Mount.RequirementsOf<typeof PopoverInternal.AnchorPopover>>
    >
  >()
  expectTypeOf<Popover.RenderInfo['backdrop']>().toEqualTypeOf<
    ReadonlyArray<
      ChildAttribute<
        Mount.RequirementsOf<typeof PopoverInternal.PortalPopoverBackdrop>
      >
    >
  >()
  expectTypeOf<Popover.RenderInfo['button']>().toEqualTypeOf<
    ReadonlyArray<ChildAttribute>
  >()

  expectTypeOf<Tooltip.RenderInfo['panel']>().toEqualTypeOf<
    ReadonlyArray<
      ChildAttribute<Mount.RequirementsOf<typeof TooltipInternal.mounts>>
    >
  >()
  expectTypeOf<Tooltip.RenderInfo['trigger']>().toEqualTypeOf<
    ReadonlyArray<ChildAttribute>
  >()
})
