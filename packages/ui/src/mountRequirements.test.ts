import { Option, Schema } from 'effect'
import * as Block from 'foldkit/block'
import type { ChildAttribute } from 'foldkit/html'
import type * as Mount from 'foldkit/mount'
import { expectTypeOf, it } from 'vitest'

import * as CalendarInternal from './calendar/block.js'
import * as Combobox from './combobox/public.js'
import * as DatePicker from './datePicker/public.js'
import * as DialogInternal from './dialog/block.js'
import * as Dialog from './dialog/public.js'
import * as Listbox from './listbox/public.js'
import * as MenuInternal from './menu/menu.js'
import * as Menu from './menu/public.js'
import * as PopoverInternal from './popover/block.js'
import * as Popover from './popover/public.js'
import * as TooltipInternal from './tooltip/block.js'
import * as Tooltip from './tooltip/public.js'
import * as VirtualList from './virtualList/public.js'

type MountRequirementsOfBindingRequirement<Requirement> =
  Requirement extends Readonly<{
    __blockBindingRequirement: Readonly<{
      block: Readonly<{ mountRequirements: () => infer Requirements }>
    }>
  }>
    ? Requirements
    : never

const TestCombobox = Combobox.makeBlock()

const ComboboxMountRequirementsKey = Symbol('ComboboxMountRequirements')

const ComboboxMountRequirementsBlock = Block.make('ComboboxMountRequirements', {
  key: ComboboxMountRequirementsKey,
  InitArgs: Schema.Tuple([]),
  Model: TestCombobox.Model,
  Message: Schema.Never,
})

const foldComboboxOutMessage =
  ComboboxMountRequirementsBlock.makeOutMessageFold(TestCombobox, {
    Selected: () => model => ({ model }),
    ClearedSelection: () => model => ({ model }),
  })

const ComboboxBinding = ComboboxMountRequirementsBlock.makeCustomBinding(
  TestCombobox,
  {
    read: model => Option.some(model),
    write: (_model, nextCombobox) => nextCombobox,
  },
).withOutMessagePolicy({ fold: foldComboboxOutMessage })

const embedCombobox = (
  model: typeof TestCombobox.Model.Type,
  viewInputs: Combobox.ViewInputs<string>,
) => ComboboxBinding.embedView({ slotId: model.id, model, viewInputs })

type EmbeddedCombobox = ReturnType<typeof embedCombobox>

const TestListbox = Listbox.makeBlock()

const ListboxMountRequirementsKey = Symbol('ListboxMountRequirements')

const ListboxMountRequirementsBlock = Block.make('ListboxMountRequirements', {
  key: ListboxMountRequirementsKey,
  InitArgs: Schema.Tuple([]),
  Model: TestListbox.Model,
  Message: Schema.Never,
})

const foldListboxOutMessage = ListboxMountRequirementsBlock.makeOutMessageFold(
  TestListbox,
  {
    Selected: () => model => ({ model }),
  },
)

const ListboxBinding = ListboxMountRequirementsBlock.makeCustomBinding(
  TestListbox,
  {
    read: model => Option.some(model),
    write: (_model, nextListbox) => nextListbox,
  },
).withOutMessagePolicy({ fold: foldListboxOutMessage })

const embedListbox = (
  model: typeof TestListbox.Model.Type,
  viewInputs: Listbox.ViewInputs<string>,
) => ListboxBinding.embedView({ slotId: model.id, model, viewInputs })

type EmbeddedListbox = ReturnType<typeof embedListbox>

const TestMenu = Menu.makeBlock()

const MenuMountRequirementsKey = Symbol('MenuMountRequirements')

const MenuMountRequirementsBlock = Block.make('MenuMountRequirements', {
  key: MenuMountRequirementsKey,
  InitArgs: Schema.Tuple([]),
  Model: TestMenu.Model,
  Message: Schema.Never,
})

const foldMenuOutMessage = MenuMountRequirementsBlock.makeOutMessageFold(
  TestMenu,
  {
    Selected: () => model => ({ model }),
    Closed: () => model => ({ model }),
  },
)

const MenuBinding = MenuMountRequirementsBlock.makeCustomBinding(TestMenu, {
  read: model => Option.some(model),
  write: (_model, nextMenu) => nextMenu,
}).withOutMessagePolicy({ fold: foldMenuOutMessage })

const embedMenu = (
  model: typeof TestMenu.Model.Type,
  viewInputs: Menu.ViewInputs<string>,
) => MenuBinding.embedView({ slotId: model.id, model, viewInputs })

type EmbeddedMenu = ReturnType<typeof embedMenu>

const TestVirtualList = VirtualList.makeBlock<string>()

it('carries published Mount contracts without exposing private registries', () => {
  expectTypeOf<
    Block.FactsOf<typeof DatePicker.DatePickerBlock>['mountRequirements']
  >().toBeNever()
  expectTypeOf<
    Block.FactsOf<typeof Dialog.DialogBlock>['mountRequirements']
  >().toEqualTypeOf<Mount.RequirementsOf<typeof DialogInternal.mounts>>()
  expectTypeOf<
    Block.FactsOf<typeof Popover.PopoverBlock>['mountRequirements']
  >().toEqualTypeOf<Mount.RequirementsOf<typeof PopoverInternal.mounts>>()
  expectTypeOf<
    Block.FactsOf<typeof Tooltip.TooltipBlock>['mountRequirements']
  >().toEqualTypeOf<Mount.RequirementsOf<typeof TooltipInternal.mounts>>()
  expectTypeOf<
    Block.FactsOf<typeof TestVirtualList>['mountRequirements']
  >().toBeNever()
  expectTypeOf<
    Block.FactsOf<typeof TestCombobox>['mountRequirements']
  >().toBeNever()
  expectTypeOf<
    Block.FactsOf<typeof TestListbox>['mountRequirements']
  >().toBeNever()
  expectTypeOf<
    Block.FactsOf<typeof TestMenu>['mountRequirements']
  >().toEqualTypeOf<Mount.RequirementsOf<typeof MenuInternal.mounts>>()
  expectTypeOf<
    MountRequirementsOfBindingRequirement<
      Block.ViewMountRequirementsOf<EmbeddedCombobox['view']>
    >
  >().toBeNever()
  expectTypeOf<
    MountRequirementsOfBindingRequirement<
      Block.ViewMountRequirementsOf<EmbeddedListbox['view']>
    >
  >().toBeNever()
  expectTypeOf<
    MountRequirementsOfBindingRequirement<
      Block.ViewMountRequirementsOf<EmbeddedMenu['view']>
    >
  >().toEqualTypeOf<Mount.RequirementsOf<typeof MenuInternal.mounts>>()
})

it('keeps the pure Calendar wrapper free of Mount requirements', () => {
  expectTypeOf<
    Block.ViewMountRequirementsOf<typeof CalendarInternal.view>
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
