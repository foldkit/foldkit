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
  HoverIntentDemoBinding,
  ListboxDemoBinding,
  ListboxGroupedDemoBinding,
  ListboxMultiDemoBinding,
  MenuAnimatedDemoBinding,
  MenuBasicDemoBinding,
  MobileMenuDialogBinding,
  NestedDialogChildDemoBinding,
  NestedDialogParentDemoBinding,
  OverlayComboboxDemoBinding,
  OverlayDialogDemoBinding,
  PopoverAnimatedDemoBinding,
  PopoverBasicDemoBinding,
  PopoverNestedChildDemoBinding,
  PopoverNestedParentDemoBinding,
  SliderRatingDemoBinding,
  SliderVolumeDemoBinding,
  ToastDemoBinding,
  TooltipBasicDemoBinding,
  TooltipNoDelayDemoBinding,
  VerticalRadioGroupDemoBinding,
  VerticalTabsDemoBinding,
  VirtualListDemoBinding,
  VirtualListVariableDemoBinding,
} from './composition'
import { AnimationDemoBinding } from './composition/animation'
import { inMessageUpdate } from './inMessageUpdate'
import { init } from './init'
import { update } from './update'

export const layer = UiBlock.makeLayer(
  Effect.gen(function* () {
    const mobileMenuDialog = yield* MobileMenuDialogBinding
    const comboboxDemo = yield* ComboboxDemoBinding
    const comboboxNullableDemo = yield* ComboboxNullableDemoBinding
    const comboboxMultiDemo = yield* ComboboxMultiDemoBinding
    const comboboxPlacementLockDemo = yield* ComboboxPlacementLockDemoBinding
    const comboboxSelectOnFocusDemo = yield* ComboboxSelectOnFocusDemoBinding
    const dialogDemo = yield* DialogDemoBinding
    const dialogAnimatedDemo = yield* DialogAnimatedDemoBinding
    const overlayDialogDemo = yield* OverlayDialogDemoBinding
    const overlayComboboxDemo = yield* OverlayComboboxDemoBinding
    const nestedDialogParentDemo = yield* NestedDialogParentDemoBinding
    const nestedDialogChildDemo = yield* NestedDialogChildDemoBinding
    const calendarBasicDemo = yield* CalendarBasicDemoBinding
    const datePickerBasicDemo = yield* DatePickerBasicDemoBinding
    const dragAndDropDemo = yield* DragAndDropDemoBinding
    const fileDropBasicDemo = yield* FileDropBasicDemoBinding
    const listboxDemo = yield* ListboxDemoBinding
    const listboxMultiDemo = yield* ListboxMultiDemoBinding
    const listboxGroupedDemo = yield* ListboxGroupedDemoBinding
    const menuBasicDemo = yield* MenuBasicDemoBinding
    const menuAnimatedDemo = yield* MenuAnimatedDemoBinding
    const popoverBasicDemo = yield* PopoverBasicDemoBinding
    const popoverAnimatedDemo = yield* PopoverAnimatedDemoBinding
    const popoverNestedParentDemo = yield* PopoverNestedParentDemoBinding
    const popoverNestedChildDemo = yield* PopoverNestedChildDemoBinding
    const verticalRadioGroupDemo = yield* VerticalRadioGroupDemoBinding
    const horizontalRadioGroupDemo = yield* HorizontalRadioGroupDemoBinding
    const sliderRatingDemo = yield* SliderRatingDemoBinding
    const sliderVolumeDemo = yield* SliderVolumeDemoBinding
    const horizontalTabsDemo = yield* HorizontalTabsDemoBinding
    const verticalTabsDemo = yield* VerticalTabsDemoBinding
    const toastDemo = yield* ToastDemoBinding
    const tooltipBasicDemo = yield* TooltipBasicDemoBinding
    const tooltipNoDelayDemo = yield* TooltipNoDelayDemoBinding
    const hoverIntentDemo = yield* HoverIntentDemoBinding
    const animationDemo = yield* AnimationDemoBinding
    const virtualListDemo = yield* VirtualListDemoBinding
    const virtualListVariableDemo = yield* VirtualListVariableDemoBinding

    return {
      children: [
        mobileMenuDialog,
        comboboxDemo,
        comboboxNullableDemo,
        comboboxMultiDemo,
        comboboxPlacementLockDemo,
        comboboxSelectOnFocusDemo,
        dialogDemo,
        dialogAnimatedDemo,
        overlayDialogDemo,
        overlayComboboxDemo,
        nestedDialogParentDemo,
        nestedDialogChildDemo,
        calendarBasicDemo,
        datePickerBasicDemo,
        dragAndDropDemo,
        fileDropBasicDemo,
        listboxDemo,
        listboxMultiDemo,
        listboxGroupedDemo,
        menuBasicDemo,
        menuAnimatedDemo,
        popoverBasicDemo,
        popoverAnimatedDemo,
        popoverNestedParentDemo,
        popoverNestedChildDemo,
        verticalRadioGroupDemo,
        horizontalRadioGroupDemo,
        sliderRatingDemo,
        sliderVolumeDemo,
        horizontalTabsDemo,
        verticalTabsDemo,
        toastDemo,
        tooltipBasicDemo,
        tooltipNoDelayDemo,
        hoverIntentDemo,
        animationDemo,
        virtualListDemo,
        virtualListVariableDemo,
      ],
      init,
      update,
      inMessageUpdate,
    }
  }),
).pipe(
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
