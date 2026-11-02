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

const TestCombobox = Combobox.make()
const TestListbox = Listbox.make()
const TestMenu = Menu.make()
const TestRadioGroup = RadioGroup.make()
const TestTabs = Tabs.make()
const TestToast = Toast.make(Schema.String)
const TestVirtualList = VirtualList.make<string>()

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

describe('public Block class Message Schemas', () => {
  it('exposes Message constructors on each Block class', () => {
    const localConstructors = [
      Animation.Animation.Message.Showed,
      Calendar.Calendar.Message.ClickedDay,
      TestCombobox.Message.RequestedOpen,
      DatePicker.DatePicker.Message.RequestedOpen,
      Dialog.Dialog.Message.RequestedOpen,
      DragAndDrop.DragAndDrop.Message.PressedDraggable,
      FileDrop.FileDrop.Message.EnteredDragZone,
      HoverIntent.HoverIntent.Message.EnteredTrigger,
      TestListbox.Message.RequestedOpen,
      TestMenu.Message.RequestedOpen,
      Popover.Popover.Message.RequestedOpen,
      TestRadioGroup.Message.SelectedOption,
      Slider.Slider.Message.PressedThumb,
      TestTabs.Message.SelectedTab,
      TestToast.Message.RequestedDismissAll,
      Tooltip.Tooltip.Message.EnteredTrigger,
      TestVirtualList.Message.RequestedScrollToEnd,
    ]

    expect(
      localConstructors.every(constructor => typeof constructor === 'function'),
    ).toBe(true)
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
