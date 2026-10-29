import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'

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

describe('public completed Block Message Codecs', () => {
  it('keeps local constructors on each completed Message Codec', () => {
    const localConstructors = [
      Animation.AnimationBlock.Message.Showed,
      Calendar.CalendarBlock.Message.ClickedDay,
      TestCombobox.Message.RequestedOpen,
      DatePicker.DatePickerBlock.Message.RequestedOpen,
      Dialog.DialogBlock.Message.RequestedOpen,
      DragAndDrop.DragAndDropBlock.Message.PressedDraggable,
      FileDrop.FileDropBlock.Message.EnteredDragZone,
      HoverIntent.HoverIntentBlock.Message.EnteredTrigger,
      TestListbox.Message.RequestedOpen,
      TestMenu.Message.RequestedOpen,
      Popover.PopoverBlock.Message.RequestedOpen,
      TestRadioGroup.Message.SelectedOption,
      Slider.SliderBlock.Message.PressedThumb,
      TestTabs.Message.SelectedTab,
      TestToast.Message.RequestedDismissAll,
      Tooltip.TooltipBlock.Message.EnteredTrigger,
      TestVirtualList.Message.RequestedScrollToEnd,
    ]

    expect(
      localConstructors.every(constructor => typeof constructor === 'function'),
    ).toBe(true)
  })

  it('decodes generated child delivery through the completed parent Codec', () => {
    const decoded = Schema.decodeSync(DatePicker.DatePickerBlock.Message)({
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
  })

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
