import { Layer } from 'effect'

import * as Animation from './animation/update.js'
import * as Calendar from './calendar/index.js'
import * as Combobox from './combobox/shared.js'
import * as Dialog from './dialog/index.js'
import * as DragAndDrop from './dragAndDrop/index.js'
import * as HoverIntent from './hoverIntent/hoverIntent.js'
import * as Listbox from './listbox/shared.js'
import * as Menu from './menu/index.js'
import * as Popover from './popover/index.js'
import * as RadioGroup from './radioGroup/index.js'
import * as Slider from './slider/index.js'
import * as Tabs from './tabs/index.js'
import * as Toast from './toast/update.js'
import * as Tooltip from './tooltip/tooltip.js'
import * as VirtualList from './virtualList/index.js'

/** Provides the handlers for Foldkit UI's static Commands, Subscriptions, and
 * Mounts. Factory-created Toast and custom-root Slider instances contribute
 * their returned `EffectsLayer` separately. */
export const EffectsLayer = Layer.mergeAll(
  Animation.EffectsLayer,
  Calendar.EffectsLayer,
  Combobox.EffectsLayer,
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

/** Mount Definitions rendered by Foldkit UI's static components. */
export const mounts = [
  ...Combobox.mounts,
  ...Dialog.mounts,
  ...Listbox.mounts,
  ...Menu.mounts,
  ...Popover.mounts,
  ...Tooltip.mounts,
  ...VirtualList.mounts,
]
