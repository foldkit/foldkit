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
