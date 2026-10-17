import { Option } from 'effect'
import * as Block from 'foldkit/block'
import type { ChildAttribute } from 'foldkit/html'
import type * as Mount from 'foldkit/mount'
import type * as Update from 'foldkit/update'
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
  View extends Block.View<
    infer _Model,
    infer _Message,
    infer _ViewInputs,
    infer Requirements
  >
    ? Requirements
    : never

type RequirementsOfBlock<CompletedBlock extends Block.AnyBlock> =
  | Mount.RequirementsOf<CompletedBlock[typeof Block.LocalMountsTypeId]>
  | Block.RequirementsOfBindings<CompletedBlock['childBindings']>

const foldComboboxOutMessage = Combobox.OutMessage.match<
  Update.Step<Combobox.Model, Combobox.Message>
>({
  Selected: () => ComboboxMountRequirements.step(model => ({ model })),
  ClearedSelection: () => ComboboxMountRequirements.step(model => ({ model })),
})

const ComboboxMountRequirements = Block.define('ComboboxMountRequirements', {
  Model: Combobox.Model,
  Message: Combobox.Message,
})

const ComboboxBinding = ComboboxMountRequirements.bindChild(Combobox.block, {
  read: model => Option.some(model),
  write: (_model, nextCombobox) => nextCombobox,
  toParentMessage: message => message,
  fromParentMessage: false,
  outMessage: { fold: foldComboboxOutMessage },
})

const embeddedCombobox = ComboboxBinding.embedView({
  slotId: 'combobox',
  model: Combobox.init({ id: 'combobox' }),
  viewInputs: {
    items: [],
    restingInputValue: '',
    itemToConfig: () => ({ content: null }),
    itemToValue: item => item,
    itemToDisplayText: item => item,
    maybeSelectedValue: Option.none(),
  },
})

const foldListboxOutMessage = Listbox.OutMessage.match<
  Update.Step<Listbox.Model, Listbox.Message>
>({
  Selected: () => ListboxMountRequirements.step(model => ({ model })),
})

const ListboxMountRequirements = Block.define('ListboxMountRequirements', {
  Model: Listbox.Model,
  Message: Listbox.Message,
})

const ListboxBinding = ListboxMountRequirements.bindChild(Listbox.block, {
  read: model => Option.some(model),
  write: (_model, nextListbox) => nextListbox,
  toParentMessage: message => message,
  fromParentMessage: false,
  outMessage: { fold: foldListboxOutMessage },
})

const embeddedListbox = ListboxBinding.embedView({
  slotId: 'listbox',
  model: Listbox.init({ id: 'listbox' }),
  viewInputs: {
    items: [],
    itemToConfig: () => ({ content: null }),
    itemToValue: item => item,
    buttonContent: null,
    maybeSelectedValue: Option.none(),
  },
})

const foldMenuOutMessage = Menu.OutMessage.match<
  Update.Step<Menu.Model, Menu.Message>
>({
  Selected: () => MenuMountRequirements.step(model => ({ model })),
})

const MenuMountRequirements = Block.define('MenuMountRequirements', {
  Model: Menu.Model,
  Message: Menu.Message,
})

const MenuBinding = MenuMountRequirements.bindChild(Menu.block, {
  read: model => Option.some(model),
  write: (_model, nextMenu) => nextMenu,
  toParentMessage: message => message,
  fromParentMessage: false,
  outMessage: { fold: foldMenuOutMessage },
})

const embeddedMenu = MenuBinding.embedView({
  slotId: 'menu',
  model: Menu.init({ id: 'menu' }),
  viewInputs: {
    items: [],
    itemToConfig: () => ({ content: null }),
    buttonContent: null,
  },
})

it('carries each mounted component registry through its view type', () => {
  expectTypeOf<RequirementsOfView<typeof DatePicker.view>>().toEqualTypeOf<
    RequirementsOfBlock<typeof DatePicker.block>
  >()
  expectTypeOf<RequirementsOfView<typeof Dialog.view>>().toEqualTypeOf<
    RequirementsOfBlock<typeof Dialog.block>
  >()
  expectTypeOf<RequirementsOfView<typeof Popover.view>>().toEqualTypeOf<
    RequirementsOfBlock<typeof Popover.block>
  >()
  expectTypeOf<RequirementsOfView<typeof Tooltip.view>>().toEqualTypeOf<
    RequirementsOfBlock<typeof Tooltip.block>
  >()
  expectTypeOf<
    RequirementsOfView<ReturnType<typeof VirtualList.view<string>>>
  >().toEqualTypeOf<
    RequirementsOfBlock<ReturnType<typeof VirtualList.create<string>>>
  >()
  expectTypeOf<
    RequirementsOfView<typeof embeddedCombobox.view>
  >().toEqualTypeOf<Block.RequirementOfBinding<typeof ComboboxBinding>>()
  expectTypeOf<
    Mount.RequirementsOf<
      (typeof Combobox.block)[typeof Block.LocalMountsTypeId]
    >
  >().toEqualTypeOf<Mount.RequirementsOf<typeof Combobox.mounts>>()
  expectTypeOf<RequirementsOfView<typeof embeddedListbox.view>>().toEqualTypeOf<
    Block.RequirementOfBinding<typeof ListboxBinding>
  >()
  expectTypeOf<
    Mount.RequirementsOf<(typeof Listbox.block)[typeof Block.LocalMountsTypeId]>
  >().toEqualTypeOf<Mount.RequirementsOf<typeof Listbox.mounts>>()
  expectTypeOf<RequirementsOfView<typeof embeddedMenu.view>>().toEqualTypeOf<
    Block.RequirementOfBinding<typeof MenuBinding>
  >()
  expectTypeOf<
    Mount.RequirementsOf<(typeof Menu.block)[typeof Block.LocalMountsTypeId]>
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
