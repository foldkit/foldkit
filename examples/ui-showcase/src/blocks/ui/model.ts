import { Schema } from 'effect'
import { File, Calendar as FoldkitCalendar } from 'foldkit'

import {
  Animation,
  Calendar,
  DatePicker,
  Dialog,
  DragAndDrop,
  FileDrop,
  HoverIntent,
  Popover,
  Slider,
  Tooltip,
} from '@foldkit/ui'

import { CityComboboxBlock, CityMultiComboboxBlock } from './combobox'
import { City, DemoColumn, DemoTab, ListboxItem, Plan } from './domain'
import {
  CharacterListboxBlock,
  ItemListboxBlock,
  ItemMultiListboxBlock,
} from './listbox'
import { DemoMenuBlock } from './menu'
import { PlanRadioGroupBlock } from './radioGroup'
import { DemoTabsBlock } from './tabs'
import { ToastBlock } from './toast'
import { ActivityVirtualListBlock } from './virtualList'

export const Model = Schema.Struct({
  mobileMenuDialog: Dialog.DialogBlock.Model,
  buttonClickCount: Schema.Number,
  inputDemoValue: Schema.String,
  textareaDemoValue: Schema.String,
  fieldsetInputValue: Schema.String,
  fieldsetTextareaValue: Schema.String,
  isFieldsetCheckboxDemoChecked: Schema.Boolean,
  calendarBasicDemo: Calendar.CalendarBlock.Model,
  maybeCalendarBasicDemoSelectedDate: Schema.Option(
    FoldkitCalendar.CalendarDate,
  ),
  datePickerBasicDemo: DatePicker.DatePickerBlock.Model,
  maybeDatePickerBasicDemoSelectedDate: Schema.Option(
    FoldkitCalendar.CalendarDate,
  ),
  isCheckboxBasicDemoChecked: Schema.Boolean,
  isCheckboxOptionADemoChecked: Schema.Boolean,
  isCheckboxOptionBDemoChecked: Schema.Boolean,
  comboboxDemo: CityComboboxBlock.Model,
  maybeComboboxDemoSelectedCity: Schema.Option(City),
  comboboxNullableDemo: CityComboboxBlock.Model,
  maybeComboboxNullableDemoSelectedCity: Schema.Option(City),
  comboboxMultiDemo: CityMultiComboboxBlock.Model,
  comboboxMultiDemoSelectedCities: Schema.Array(City),
  comboboxPlacementLockDemo: CityComboboxBlock.Model,
  maybeComboboxPlacementLockDemoSelectedCity: Schema.Option(City),
  comboboxSelectOnFocusDemo: CityComboboxBlock.Model,
  maybeComboboxSelectOnFocusDemoSelectedCity: Schema.Option(City),
  dialogDemo: Dialog.DialogBlock.Model,
  dialogAnimatedDemo: Dialog.DialogBlock.Model,
  overlayDialogDemo: Dialog.DialogBlock.Model,
  overlayComboboxDemo: CityComboboxBlock.Model,
  maybeOverlayComboboxDemoSelectedCity: Schema.Option(City),
  nestedDialogParentDemo: Dialog.DialogBlock.Model,
  nestedDialogChildDemo: Dialog.DialogBlock.Model,
  isDisclosureBasicDemoOpen: Schema.Boolean,
  isDisclosureAnimatedDemoOpen: Schema.Boolean,
  isDisclosureCollapsedPreviewDemoOpen: Schema.Boolean,
  dragAndDropDemo: DragAndDrop.DragAndDropBlock.Model,
  dragAndDropDemoColumns: Schema.Array(DemoColumn),
  fileDropBasicDemo: FileDrop.FileDropBlock.Model,
  fileDropBasicDemoFiles: Schema.Array(File.File),
  hoverIntentDemo: HoverIntent.HoverIntentBlock.Model,
  listboxDemo: ItemListboxBlock.Model,
  maybeListboxDemoSelectedItem: Schema.Option(ListboxItem),
  listboxMultiDemo: ItemMultiListboxBlock.Model,
  listboxMultiDemoSelectedItems: Schema.Array(ListboxItem),
  listboxGroupedDemo: CharacterListboxBlock.Model,
  maybeListboxGroupedDemoSelectedItem: Schema.Option(Schema.String),
  menuBasicDemo: DemoMenuBlock.Model,
  menuAnimatedDemo: DemoMenuBlock.Model,
  popoverBasicDemo: Popover.PopoverBlock.Model,
  popoverAnimatedDemo: Popover.PopoverBlock.Model,
  popoverNestedParentDemo: Popover.PopoverBlock.Model,
  popoverNestedChildDemo: Popover.PopoverBlock.Model,
  verticalRadioGroupDemo: PlanRadioGroupBlock.Model,
  verticalRadioGroupDemoValue: Schema.Option(Plan),
  horizontalRadioGroupDemo: PlanRadioGroupBlock.Model,
  horizontalRadioGroupDemoValue: Schema.Option(Plan),
  selectDemoValue: Schema.String,
  sliderRatingDemo: Slider.SliderBlock.Model,
  sliderRatingValue: Schema.Number,
  sliderVolumeDemo: Slider.SliderBlock.Model,
  sliderVolumeValue: Schema.Number,
  isSwitchDemoChecked: Schema.Boolean,
  horizontalTabsDemo: DemoTabsBlock.Model,
  horizontalTabsDemoTab: DemoTab,
  verticalTabsDemo: DemoTabsBlock.Model,
  verticalTabsDemoTab: DemoTab,
  toastDemo: ToastBlock.Model,
  tooltipBasicDemo: Tooltip.TooltipBlock.Model,
  tooltipNoDelayDemo: Tooltip.TooltipBlock.Model,
  animationDemo: Animation.AnimationBlock.Model,
  virtualListDemo: ActivityVirtualListBlock.Model,
  virtualListVariableDemo: ActivityVirtualListBlock.Model,
})
export type Model = typeof Model.Type
