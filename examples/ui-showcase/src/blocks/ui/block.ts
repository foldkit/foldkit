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
import { UiDefinition } from './definition'
import { init } from './init'
import { receive } from './receive'
import { update } from './update'

export const layer = UiDefinition.makeBlock(
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
      receive,
    }
  }),
).provide(
  Layer.mergeAll(
    AnimationLayer,
    CalendarLayer,
    ComboboxLayer,
    DatePickerLayer,
    DialogLayer,
    DragAndDropLayer,
    FileDropLayer,
    HoverIntentLayer,
    ListboxLayer,
    MenuLayer,
    PopoverLayer,
    RadioGroupLayer,
    SliderLayer,
    TabsLayer,
    ToastLayer,
    TooltipLayer,
    VirtualListLayer,
    MultiCombobox.layer,
    MultiListbox.layer,
  ),
).layer
