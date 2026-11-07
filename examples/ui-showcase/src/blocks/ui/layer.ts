import { Layer } from 'effect'

import {
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
} from '@foldkit/ui'

import { UiBlock } from './block'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'

export const layer = UiBlock.makeLayer({
  init,
  update,
  inMessageUpdate,
}).pipe(
  Layer.provide(
    Layer.mergeAll(
      Animation.layer,
      Calendar.layer,
      Combobox.layer,
      DatePicker.layer,
      Dialog.layer,
      DragAndDrop.layer,
      FileDrop.layer,
      HoverIntent.layer,
      Listbox.layer,
      Menu.layer,
      Popover.layer,
      RadioGroup.layer,
      Slider.layer,
      Tabs.layer,
      Toast.layer,
      Tooltip.layer,
      VirtualList.layer,
      Combobox.Multi.layer,
      Listbox.Multi.layer,
    ),
  ),
)
