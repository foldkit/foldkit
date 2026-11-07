import { Effect, Layer } from 'effect'

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
import { UiComposition } from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view'
import { FetchVirtualListChatHistory } from './virtualListChat'

export const layer = UiBlock.makeLayer(
  Effect.gen(function* () {
    const children = yield* UiComposition.acquireChildren()

    return {
      children,
      init,
      update,
      view,
      EffectsLayer: FetchVirtualListChatHistory.layer,
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      Animation.layer,
      Calendar.layer,
      Combobox.layer,
      Combobox.Multi.layer,
      DatePicker.layer,
      Dialog.layer,
      DragAndDrop.layer,
      FileDrop.layer,
      HoverIntent.layer,
      Listbox.layer,
      Listbox.Multi.layer,
      Menu.layer,
      Popover.layer,
      RadioGroup.layer,
      Slider.layer,
      Tabs.layer,
      Toast.layer,
      Tooltip.layer,
      VirtualList.layer,
    ),
  ),
)
