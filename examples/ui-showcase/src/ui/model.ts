import { Schema } from 'effect'
import { File, Calendar as FoldkitCalendar } from 'foldkit'

import {
  AnimationBlock,
  CalendarBlock,
  DatePickerBlock,
  DialogBlock,
  DragAndDropBlock,
  FileDropBlock,
  HoverIntentBlock,
  PopoverBlock,
  SliderBlock,
  TooltipBlock,
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
  mobileMenuDialog: DialogBlock.Model,
  buttonClickCount: Schema.Number,
  inputDemoValue: Schema.String,
  textareaDemoValue: Schema.String,
  fieldsetInputValue: Schema.String,
  fieldsetTextareaValue: Schema.String,
  isFieldsetCheckboxDemoChecked: Schema.Boolean,
  calendarBasicDemo: CalendarBlock.Model,
  maybeCalendarBasicDemoSelectedDate: Schema.Option(
    FoldkitCalendar.CalendarDate,
  ),
  datePickerBasicDemo: DatePickerBlock.Model,
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
  dialogDemo: DialogBlock.Model,
  dialogAnimatedDemo: DialogBlock.Model,
  overlayDialogDemo: DialogBlock.Model,
  overlayComboboxDemo: CityComboboxBlock.Model,
  maybeOverlayComboboxDemoSelectedCity: Schema.Option(City),
  nestedDialogParentDemo: DialogBlock.Model,
  nestedDialogChildDemo: DialogBlock.Model,
  isDisclosureBasicDemoOpen: Schema.Boolean,
  isDisclosureAnimatedDemoOpen: Schema.Boolean,
  isDisclosureCollapsedPreviewDemoOpen: Schema.Boolean,
  dragAndDropDemo: DragAndDropBlock.Model,
  dragAndDropDemoColumns: Schema.Array(DemoColumn),
  fileDropBasicDemo: FileDropBlock.Model,
  fileDropBasicDemoFiles: Schema.Array(File.File),
  hoverIntentDemo: HoverIntentBlock.Model,
  listboxDemo: ItemListboxBlock.Model,
  maybeListboxDemoSelectedItem: Schema.Option(ListboxItem),
  listboxMultiDemo: ItemMultiListboxBlock.Model,
  listboxMultiDemoSelectedItems: Schema.Array(ListboxItem),
  listboxGroupedDemo: CharacterListboxBlock.Model,
  maybeListboxGroupedDemoSelectedItem: Schema.Option(Schema.String),
  menuBasicDemo: DemoMenuBlock.Model,
  menuAnimatedDemo: DemoMenuBlock.Model,
  popoverBasicDemo: PopoverBlock.Model,
  popoverAnimatedDemo: PopoverBlock.Model,
  popoverNestedParentDemo: PopoverBlock.Model,
  popoverNestedChildDemo: PopoverBlock.Model,
  verticalRadioGroupDemo: PlanRadioGroupBlock.Model,
  verticalRadioGroupDemoValue: Schema.Option(Plan),
  horizontalRadioGroupDemo: PlanRadioGroupBlock.Model,
  horizontalRadioGroupDemoValue: Schema.Option(Plan),
  selectDemoValue: Schema.String,
  sliderRatingDemo: SliderBlock.Model,
  sliderRatingValue: Schema.Number,
  sliderVolumeDemo: SliderBlock.Model,
  sliderVolumeValue: Schema.Number,
  isSwitchDemoChecked: Schema.Boolean,
  horizontalTabsDemo: DemoTabsBlock.Model,
  horizontalTabsDemoTab: DemoTab,
  verticalTabsDemo: DemoTabsBlock.Model,
  verticalTabsDemoTab: DemoTab,
  toastDemo: ToastBlock.Model,
  tooltipBasicDemo: TooltipBlock.Model,
  tooltipNoDelayDemo: TooltipBlock.Model,
  animationDemo: AnimationBlock.Model,
  virtualListDemo: ActivityVirtualListBlock.Model,
  virtualListVariableDemo: ActivityVirtualListBlock.Model,
})
export type Model = typeof Model.Type
