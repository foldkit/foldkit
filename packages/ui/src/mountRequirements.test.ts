import { Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import type { ChildAttribute } from 'foldkit/html'
import type * as Mount from 'foldkit/mount'
import { expectTypeOf, it } from 'vitest'

import * as CalendarInternal from './calendar/block.js'
import * as Combobox from './combobox/public.js'
import * as ComboboxInternal from './combobox/shared.js'
import * as DatePickerInternal from './datePicker/block.js'
import * as DatePicker from './datePicker/public.js'
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
  | Block.RequirementsOfBindings<CompletedBlock['bindings']>

type MountRequirementsOfBindingRequirement<Requirement> =
  Requirement extends Readonly<{
    __blockBindingRequirement: Readonly<{
      block: Readonly<{ mountRequirements: () => infer Requirements }>
    }>
  }>
    ? Requirements
    : never

const TestCombobox = Combobox.makeBlock()

const ComboboxMountRequirementsDefinition = Block.makeDefinition(
  'ComboboxMountRequirements',
  {
    Model: TestCombobox.Model,
    Message: Schema.Never,
  },
)

const foldComboboxOutMessage =
  ComboboxMountRequirementsDefinition.makeOutMessageFold(TestCombobox, {
    Selected: () => model => ({ model }),
    ClearedSelection: () => model => ({ model }),
  })

const ComboboxBinding = ComboboxMountRequirementsDefinition.makeBinding(
  TestCombobox,
  {
    read: model => Option.some(model),
    write: (_model, nextCombobox) => nextCombobox,
  },
).withOutMessagePolicy({ fold: foldComboboxOutMessage })

const embeddedCombobox = ComboboxBinding.embedView({
  slotId: 'combobox',
  model: TestCombobox.init({ id: 'combobox' }).model,
  viewInputs: {
    items: [],
    restingInputValue: '',
    itemToConfig: () => ({ content: null }),
    itemToValue: item => item,
    itemToDisplayText: item => item,
    maybeSelectedValue: Option.none(),
  },
})

const TestListbox = Listbox.makeBlock()

const ListboxMountRequirementsDefinition = Block.makeDefinition(
  'ListboxMountRequirements',
  {
    Model: TestListbox.Model,
    Message: Schema.Never,
  },
)

const foldListboxOutMessage =
  ListboxMountRequirementsDefinition.makeOutMessageFold(TestListbox, {
    Selected: () => model => ({ model }),
  })

const ListboxBinding = ListboxMountRequirementsDefinition.makeBinding(
  TestListbox,
  {
    read: model => Option.some(model),
    write: (_model, nextListbox) => nextListbox,
  },
).withOutMessagePolicy({ fold: foldListboxOutMessage })

const embeddedListbox = ListboxBinding.embedView({
  slotId: 'listbox',
  model: TestListbox.init({ id: 'listbox' }).model,
  viewInputs: {
    items: [],
    itemToConfig: () => ({ content: null }),
    itemToValue: item => item,
    buttonContent: null,
    maybeSelectedValue: Option.none(),
  },
})

const TestMenu = Menu.makeBlock()

const MenuMountRequirementsDefinition = Block.makeDefinition(
  'MenuMountRequirements',
  {
    Model: TestMenu.Model,
    Message: Schema.Never,
  },
)

const foldMenuOutMessage = MenuMountRequirementsDefinition.makeOutMessageFold(
  TestMenu,
  {
    Selected: () => model => ({ model }),
    Closed: () => model => ({ model }),
  },
)

const MenuBinding = MenuMountRequirementsDefinition.makeBinding(TestMenu, {
  read: model => Option.some(model),
  write: (_model, nextMenu) => nextMenu,
}).withOutMessagePolicy({ fold: foldMenuOutMessage })

const embeddedMenu = MenuBinding.embedView({
  slotId: 'menu',
  model: TestMenu.init({ id: 'menu' }).model,
  viewInputs: {
    items: [],
    itemToConfig: () => ({ content: null }),
    buttonContent: null,
  },
})

const TestVirtualList = VirtualList.makeBlock<string>()

it('carries each mounted component registry through its view type', () => {
  expectTypeOf<
    RequirementsOfView<typeof DatePickerInternal.view>
  >().toEqualTypeOf<RequirementsOfBlock<typeof DatePicker.DatePickerBlock>>()
  expectTypeOf<RequirementsOfView<typeof DialogInternal.view>>().toEqualTypeOf<
    RequirementsOfBlock<typeof Dialog.DialogBlock>
  >()
  expectTypeOf<RequirementsOfView<typeof PopoverInternal.view>>().toEqualTypeOf<
    RequirementsOfBlock<typeof Popover.PopoverBlock>
  >()
  expectTypeOf<RequirementsOfView<typeof TooltipInternal.view>>().toEqualTypeOf<
    RequirementsOfBlock<typeof Tooltip.TooltipBlock>
  >()
  expectTypeOf<
    RequirementsOfView<ReturnType<typeof VirtualListInternal.view<string>>>
  >().toEqualTypeOf<RequirementsOfBlock<typeof TestVirtualList>>()
  expectTypeOf<
    MountRequirementsOfBindingRequirement<
      RequirementsOfView<typeof embeddedCombobox.view>
    >
  >().toEqualTypeOf<Mount.RequirementsOf<typeof ComboboxInternal.mounts>>()
  expectTypeOf<
    Mount.RequirementsOf<(typeof TestCombobox)[typeof Block.LocalMountsTypeId]>
  >().toEqualTypeOf<Mount.RequirementsOf<typeof ComboboxInternal.mounts>>()
  expectTypeOf<
    MountRequirementsOfBindingRequirement<
      RequirementsOfView<typeof embeddedListbox.view>
    >
  >().toEqualTypeOf<Mount.RequirementsOf<typeof ListboxInternal.mounts>>()
  expectTypeOf<
    Mount.RequirementsOf<(typeof TestListbox)[typeof Block.LocalMountsTypeId]>
  >().toEqualTypeOf<Mount.RequirementsOf<typeof ListboxInternal.mounts>>()
  expectTypeOf<
    MountRequirementsOfBindingRequirement<
      RequirementsOfView<typeof embeddedMenu.view>
    >
  >().toEqualTypeOf<Mount.RequirementsOf<typeof MenuInternal.mounts>>()
  expectTypeOf<
    Mount.RequirementsOf<(typeof TestMenu)[typeof Block.LocalMountsTypeId]>
  >().toEqualTypeOf<Mount.RequirementsOf<typeof MenuInternal.mounts>>()
})

it('keeps the pure Calendar wrapper free of Mount requirements', () => {
  expectTypeOf<
    RequirementsOfView<typeof CalendarInternal.view>
  >().toEqualTypeOf<never>()
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
