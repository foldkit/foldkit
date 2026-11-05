import { Effect, Layer } from 'effect'

import { layer as AnimationLayer } from '@foldkit/ui/animation'
import { layer as CalendarLayer } from '@foldkit/ui/calendar'
import {
  layer as ComboboxLayer,
  Multi as MultiCombobox,
} from '@foldkit/ui/combobox'
import { layer as DatePickerLayer } from '@foldkit/ui/datePicker'
import { layer as DialogLayer } from '@foldkit/ui/dialog'
import { layer as DragAndDropLayer } from '@foldkit/ui/dragAndDrop'
import { layer as FileDropLayer } from '@foldkit/ui/fileDrop'
import { layer as HoverIntentLayer } from '@foldkit/ui/hoverIntent'
import {
  layer as ListboxLayer,
  Multi as MultiListbox,
} from '@foldkit/ui/listbox'
import { layer as MenuLayer } from '@foldkit/ui/menu'
import { layer as PopoverLayer } from '@foldkit/ui/popover'
import { layer as RadioGroupLayer } from '@foldkit/ui/radioGroup'
import { layer as SliderLayer } from '@foldkit/ui/slider'
import { layer as TabsLayer } from '@foldkit/ui/tabs'
import { layer as ToastLayer } from '@foldkit/ui/toast'
import { layer as TooltipLayer } from '@foldkit/ui/tooltip'
import { layer as VirtualListLayer } from '@foldkit/ui/virtualList'

import { UiBlock } from './block'
import {
  AnimationDemoBinding,
  CalendarBasicDemoBinding,
  ComboboxDemoBinding,
  ComboboxMultiDemoBinding,
  ComboboxNullableDemoBinding,
  ComboboxPlacementLockDemoBinding,
  ComboboxSelectOnFocusDemoBinding,
  DatePickerBasicDemoBinding,
  DialogAnimatedDemoBinding,
  DialogDemoBinding,
  DragAndDropDemoBinding,
  FileDropBasicDemoBinding,
  HorizontalRadioGroupDemoBinding,
  HorizontalTabsDemoBinding,
  HoverIntentCardDemoBinding,
  HoverIntentMenuDemoBinding,
  ListboxDemoBinding,
  ListboxGroupedDemoBinding,
  ListboxMultiDemoBinding,
  MenuAnimatedDemoBinding,
  MenuBasicDemoBinding,
  NestedDialogChildDemoBinding,
  NestedDialogParentDemoBinding,
  OverlayComboboxDemoBinding,
  OverlayDialogDemoBinding,
  PopoverAnimatedDemoBinding,
  PopoverArrowDemoBinding,
  PopoverBasicDemoBinding,
  PopoverNestedChildDemoBinding,
  PopoverNestedParentDemoBinding,
  SliderRatingDemoBinding,
  SliderVolumeDemoBinding,
  ToastDemoBinding,
  TooltipDemoBinding,
  VerticalRadioGroupDemoBinding,
  VerticalTabsDemoBinding,
  VirtualListChatDemoBinding,
  VirtualListChatHistoryModeGroupBinding,
  VirtualListDemoBinding,
  VirtualListVariableDemoBinding,
} from './composition'
import { init } from './init'
import { update } from './update'
import { view } from './view'
import { FetchVirtualListChatHistory } from './virtualListChat'

export const layer = UiBlock.makeLayer(
  Effect.gen(function* () {
    const animationDemo = yield* AnimationDemoBinding
    const calendarBasicDemo = yield* CalendarBasicDemoBinding
    const comboboxDemo = yield* ComboboxDemoBinding
    const comboboxMultiDemo = yield* ComboboxMultiDemoBinding
    const comboboxNullableDemo = yield* ComboboxNullableDemoBinding
    const comboboxPlacementLockDemo = yield* ComboboxPlacementLockDemoBinding
    const comboboxSelectOnFocusDemo = yield* ComboboxSelectOnFocusDemoBinding
    const datePickerBasicDemo = yield* DatePickerBasicDemoBinding
    const dialogAnimatedDemo = yield* DialogAnimatedDemoBinding
    const dialogDemo = yield* DialogDemoBinding
    const dragAndDropDemo = yield* DragAndDropDemoBinding
    const fileDropBasicDemo = yield* FileDropBasicDemoBinding
    const horizontalRadioGroupDemo = yield* HorizontalRadioGroupDemoBinding
    const horizontalTabsDemo = yield* HorizontalTabsDemoBinding
    const hoverIntentCardDemo = yield* HoverIntentCardDemoBinding
    const hoverIntentMenuDemo = yield* HoverIntentMenuDemoBinding
    const listboxDemo = yield* ListboxDemoBinding
    const listboxGroupedDemo = yield* ListboxGroupedDemoBinding
    const listboxMultiDemo = yield* ListboxMultiDemoBinding
    const menuAnimatedDemo = yield* MenuAnimatedDemoBinding
    const menuBasicDemo = yield* MenuBasicDemoBinding
    const nestedDialogChildDemo = yield* NestedDialogChildDemoBinding
    const nestedDialogParentDemo = yield* NestedDialogParentDemoBinding
    const overlayComboboxDemo = yield* OverlayComboboxDemoBinding
    const overlayDialogDemo = yield* OverlayDialogDemoBinding
    const popoverAnimatedDemo = yield* PopoverAnimatedDemoBinding
    const popoverArrowDemo = yield* PopoverArrowDemoBinding
    const popoverBasicDemo = yield* PopoverBasicDemoBinding
    const popoverNestedChildDemo = yield* PopoverNestedChildDemoBinding
    const popoverNestedParentDemo = yield* PopoverNestedParentDemoBinding
    const sliderRatingDemo = yield* SliderRatingDemoBinding
    const sliderVolumeDemo = yield* SliderVolumeDemoBinding
    const toastDemo = yield* ToastDemoBinding
    const tooltipDemo = yield* TooltipDemoBinding
    const verticalRadioGroupDemo = yield* VerticalRadioGroupDemoBinding
    const verticalTabsDemo = yield* VerticalTabsDemoBinding
    const virtualListChatDemo = yield* VirtualListChatDemoBinding
    const virtualListChatHistoryModeGroup =
      yield* VirtualListChatHistoryModeGroupBinding
    const virtualListDemo = yield* VirtualListDemoBinding
    const virtualListVariableDemo = yield* VirtualListVariableDemoBinding

    return {
      children: [
        animationDemo,
        calendarBasicDemo,
        comboboxDemo,
        comboboxMultiDemo,
        comboboxNullableDemo,
        comboboxPlacementLockDemo,
        comboboxSelectOnFocusDemo,
        datePickerBasicDemo,
        dialogAnimatedDemo,
        dialogDemo,
        dragAndDropDemo,
        fileDropBasicDemo,
        horizontalRadioGroupDemo,
        horizontalTabsDemo,
        hoverIntentCardDemo,
        hoverIntentMenuDemo,
        listboxDemo,
        listboxGroupedDemo,
        listboxMultiDemo,
        menuAnimatedDemo,
        menuBasicDemo,
        nestedDialogChildDemo,
        nestedDialogParentDemo,
        overlayComboboxDemo,
        overlayDialogDemo,
        popoverAnimatedDemo,
        popoverArrowDemo,
        popoverBasicDemo,
        popoverNestedChildDemo,
        popoverNestedParentDemo,
        sliderRatingDemo,
        sliderVolumeDemo,
        toastDemo,
        tooltipDemo,
        verticalRadioGroupDemo,
        verticalTabsDemo,
        virtualListChatDemo,
        virtualListChatHistoryModeGroup,
        virtualListDemo,
        virtualListVariableDemo,
      ],
      init,
      update,
      view,
      EffectsLayer: FetchVirtualListChatHistory.layer,
    }
  }),
).pipe(
  Layer.provide(
    Layer.mergeAll(
      AnimationLayer,
      CalendarLayer,
      ComboboxLayer,
      MultiCombobox.layer,
      DatePickerLayer,
      DialogLayer,
      DragAndDropLayer,
      FileDropLayer,
      HoverIntentLayer,
      ListboxLayer,
      MultiListbox.layer,
      MenuLayer,
      PopoverLayer,
      RadioGroupLayer,
      SliderLayer,
      TabsLayer,
      ToastLayer,
      TooltipLayer,
      VirtualListLayer,
    ),
  ),
)
