import { Effect, Schema } from 'effect'
import * as Story from 'foldkit/story'
import { expect } from 'vitest'

import { describe, it } from '@effect/vitest'

import * as Animation from './animation/public.js'
import * as Calendar from './calendar/public.js'
import * as Combobox from './combobox/public.js'
import * as DatePicker from './datePicker/public.js'
import * as Dialog from './dialog/public.js'
import * as DragAndDrop from './dragAndDrop/public.js'
import * as FileDrop from './fileDrop/public.js'
import * as HoverIntent from './hoverIntent/public.js'
import * as Listbox from './listbox/public.js'
import * as Menu from './menu/public.js'
import * as Popover from './popover/public.js'
import * as RadioGroup from './radioGroup/public.js'
import * as Slider from './slider/public.js'
import * as Tabs from './tabs/public.js'
import * as Toast from './toast/public.js'
import * as Tooltip from './tooltip/public.js'
import * as VirtualList from './virtualList/public.js'

const TestCombobox = Combobox.makeBlock()
const TestListbox = Listbox.makeBlock()
const TestMenu = Menu.makeBlock()
const TestRadioGroup = RadioGroup.makeBlock()
const TestTabs = Tabs.makeBlock()
const TestToast = Toast.makeBlock(Schema.String)
const TestVirtualList = VirtualList.makeBlock<string>()

const statefulBarrels: ReadonlyArray<Record<string, unknown>> = [
  Animation,
  Calendar,
  Combobox,
  DatePicker,
  Dialog,
  DragAndDrop,
  FileDrop,
  HoverIntent,
  Listbox,
  Menu,
  Popover,
  RadioGroup,
  Slider,
  Tabs,
  Toast,
  Tooltip,
  VirtualList,
]

describe('public Block contracts and acquired Message Codecs', () => {
  it('keeps local constructors on each public Message contract', () => {
    const localConstructors = [
      Animation.AnimationBlock.Message.Showed,
      Calendar.CalendarBlock.Message.ClickedDay,
      TestCombobox.Message.UpdatedInputValue,
      DatePicker.DatePickerBlock.Message.Opened,
      Dialog.DialogBlock.Message.CanceledDialog,
      DragAndDrop.DragAndDropBlock.Message.PressedDraggable,
      FileDrop.FileDropBlock.Message.EnteredDragZone,
      HoverIntent.HoverIntentBlock.Message.EnteredTrigger,
      TestListbox.Message.ClickedButton,
      TestMenu.Message.ClickedButton,
      Popover.PopoverBlock.Message.ClickedButton,
      TestRadioGroup.Message.SelectedOption,
      Slider.SliderBlock.Message.PressedThumb,
      TestTabs.Message.SelectedTab,
      TestToast.Message.Dismissed,
      Tooltip.TooltipBlock.Message.EnteredTrigger,
      TestVirtualList.Message.MeasuredRows,
    ]

    expect(
      localConstructors.every(constructor => typeof constructor === 'function'),
    ).toBe(true)
  })

  it('keeps parent inputs separate from local Message Codecs', () => {
    for (const block of [
      Dialog.DialogBlock,
      Popover.PopoverBlock,
      HoverIntent.HoverIntentBlock,
    ]) {
      const requestedClose = block.InMessage.RequestedClose()

      expect(Schema.is(block.InMessage)(requestedClose)).toBe(true)
      expect(Schema.is(block.Message)(requestedClose)).toBe(false)
    }

    expect(Dialog.InMessage).toBe(Dialog.DialogBlock.InMessage)
    expect(Popover.InMessage).toBe(Popover.PopoverBlock.InMessage)
    expect(HoverIntent.InMessage).toBe(HoverIntent.HoverIntentBlock.InMessage)

    const rangeChange = Slider.InMessage.InformedOfRangeChange({
      min: 0,
      max: 1,
    })

    expect(Slider.InMessage).toBe(Slider.SliderBlock.InMessage)
    expect(Schema.is(Slider.SliderBlock.InMessage)(rangeChange)).toBe(true)
    expect(Schema.is(Slider.SliderBlock.Message)(rangeChange)).toBe(false)

    for (const { block, input } of [
      {
        block: Animation.AnimationBlock,
        input: Animation.InMessage.RequestedShow(),
      },
      {
        block: Calendar.CalendarBlock,
        input: Calendar.InMessage.RequestedDropToDays(),
      },
      { block: TestCombobox, input: Combobox.InMessage.RequestedOpen() },
      {
        block: DatePicker.DatePickerBlock,
        input: DatePicker.InMessage.RequestedClear(),
      },
      { block: TestListbox, input: Listbox.InMessage.RequestedOpen() },
      { block: TestMenu, input: Menu.InMessage.RequestedClose() },
      { block: TestToast, input: Toast.InMessage.RequestedDismissAll() },
      {
        block: TestVirtualList,
        input: VirtualList.InMessage.RequestedScrollToEnd(),
      },
    ]) {
      expect(Schema.is(block.InMessage)(input)).toBe(true)
      expect(Schema.is(block.Message)(input)).toBe(false)
    }
  })

  it.effect(
    'decodes generated child delivery through the acquired parent Codec',
    () =>
      Story.withBlock(DatePicker.DatePickerBlock, datePicker => {
        const decoded = Schema.decodeUnknownSync(datePicker.Message)({
          _tag: 'GotCalendarMessage',
          placement: 'calendar',
          generation: 0,
          message: Calendar.CalendarBlock.Message.ClickedHeading(),
        })

        expect(decoded).toEqual({
          _tag: 'GotCalendarMessage',
          placement: 'calendar',
          generation: 0,
          message: { _tag: 'ClickedHeading' },
        })
      }).pipe(Effect.provide(DatePicker.layer)),
  )

  it('keeps structural implementation facades out of public barrels', () => {
    for (const barrel of statefulBarrels) {
      expect(barrel).not.toHaveProperty('block')
      expect(barrel).not.toHaveProperty('Model')
      expect(barrel).not.toHaveProperty('Message')
      expect(barrel).not.toHaveProperty('OutMessage')
      expect(barrel).not.toHaveProperty('update')
    }
  })
})
