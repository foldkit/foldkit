import type { ChildAttribute } from 'foldkit/html'
import type * as Mount from 'foldkit/mount'
import type * as Submodel from 'foldkit/submodel'
import { expectTypeOf, it } from 'vitest'

import * as Calendar from './calendar/public.js'
import * as Combobox from './combobox/public.js'
import * as DatePicker from './datePicker/public.js'
import * as Dialog from './dialog/public.js'
import * as Listbox from './listbox/public.js'
import * as Menu from './menu/public.js'
import * as Popover from './popover/public.js'
import * as Tooltip from './tooltip/public.js'
import * as VirtualList from './virtualList/public.js'

type RequirementsOfView<View> =
  View extends Submodel.View<
    infer _Model,
    infer _Message,
    infer _ViewInputs,
    infer Requirements
  >
    ? Requirements
    : never

it('carries each mounted component registry through its view type', () => {
  expectTypeOf<RequirementsOfView<typeof DatePicker.view>>().toEqualTypeOf<
    Mount.RequirementsOf<typeof DatePicker.mounts>
  >()
  expectTypeOf<RequirementsOfView<typeof Dialog.view>>().toEqualTypeOf<
    Mount.RequirementsOf<typeof Dialog.mounts>
  >()
  expectTypeOf<RequirementsOfView<typeof Popover.view>>().toEqualTypeOf<
    Mount.RequirementsOf<typeof Popover.mounts>
  >()
  expectTypeOf<RequirementsOfView<typeof Tooltip.view>>().toEqualTypeOf<
    Mount.RequirementsOf<typeof Tooltip.mounts>
  >()
  expectTypeOf<
    RequirementsOfView<ReturnType<typeof VirtualList.view<string>>>
  >().toEqualTypeOf<Mount.RequirementsOf<typeof VirtualList.mounts>>()
  expectTypeOf<
    RequirementsOfView<ReturnType<typeof Combobox.create<string>>['view']>
  >().toEqualTypeOf<Mount.RequirementsOf<typeof Combobox.mounts>>()
  expectTypeOf<
    RequirementsOfView<ReturnType<typeof Listbox.create<string>>['view']>
  >().toEqualTypeOf<Mount.RequirementsOf<typeof Listbox.mounts>>()
  expectTypeOf<
    RequirementsOfView<ReturnType<typeof Menu.create<string>>['view']>
  >().toEqualTypeOf<Mount.RequirementsOf<typeof Menu.mounts>>()
})

it('keeps the pure Calendar wrapper free of Mount requirements', () => {
  expectTypeOf<
    RequirementsOfView<typeof Calendar.view>
  >().toEqualTypeOf<never>()
})

it('marks only the slot groups that carry Mount attributes', () => {
  expectTypeOf<Dialog.RenderInfo['dialog']>().toEqualTypeOf<
    ReadonlyArray<ChildAttribute<Mount.RequirementsOf<typeof Dialog.mounts>>>
  >()
  expectTypeOf<Dialog.RenderInfo['panel']>().toEqualTypeOf<
    ReadonlyArray<ChildAttribute>
  >()

  expectTypeOf<Popover.RenderInfo['panel']>().toEqualTypeOf<
    ReadonlyArray<
      ChildAttribute<Mount.RequirementsOf<typeof Popover.AnchorPopover>>
    >
  >()
  expectTypeOf<Popover.RenderInfo['backdrop']>().toEqualTypeOf<
    ReadonlyArray<
      ChildAttribute<Mount.RequirementsOf<typeof Popover.PortalPopoverBackdrop>>
    >
  >()
  expectTypeOf<Popover.RenderInfo['button']>().toEqualTypeOf<
    ReadonlyArray<ChildAttribute>
  >()

  expectTypeOf<Tooltip.RenderInfo['panel']>().toEqualTypeOf<
    ReadonlyArray<ChildAttribute<Mount.RequirementsOf<typeof Tooltip.mounts>>>
  >()
  expectTypeOf<Tooltip.RenderInfo['trigger']>().toEqualTypeOf<
    ReadonlyArray<ChildAttribute>
  >()
})
