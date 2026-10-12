import { Layer } from 'effect'

import {
  Animation,
  Calendar,
  Combobox,
  DatePicker,
  Dialog,
  DragAndDrop,
  HoverIntent,
  Listbox,
  Menu,
  Popover,
  RadioGroup,
  Slider,
  Tabs,
  Tooltip,
  VirtualList,
} from '@foldkit/ui'

import { Toast } from './demo/toastModule'

export const EffectsLayer = Layer.mergeAll(
  Animation.EffectsLayer,
  Calendar.EffectsLayer,
  Combobox.EffectsLayer,
  DatePicker.EffectsLayer,
  Dialog.EffectsLayer,
  DragAndDrop.EffectsLayer,
  HoverIntent.EffectsLayer,
  Listbox.EffectsLayer,
  Menu.EffectsLayer,
  Popover.EffectsLayer,
  RadioGroup.EffectsLayer,
  Slider.EffectsLayer,
  Tabs.EffectsLayer,
  Toast.EffectsLayer,
  Tooltip.EffectsLayer,
  VirtualList.EffectsLayer,
)

export const mounts = [
  ...Combobox.mounts,
  ...Dialog.mounts,
  ...Listbox.mounts,
  ...Menu.mounts,
  ...Popover.mounts,
  ...Tooltip.mounts,
  ...VirtualList.mounts,
]
