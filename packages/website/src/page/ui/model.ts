import { Schema } from 'effect'
import { File, Calendar as FoldkitCalendar } from 'foldkit'

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
  Tooltip,
  VirtualList,
} from '@foldkit/ui'

import { Toast } from './demo/toastModule'

export const Plan = Schema.Literals(['Startup', 'Business', 'Enterprise'])
export type Plan = typeof Plan.Type

export const DemoTab = Schema.Literals(['Foldkit', 'React', 'Elm'])
export type DemoTab = typeof DemoTab.Type

export const City = Schema.Literals([
  'Johannesburg',
  'Kyiv',
  'Oxford',
  'Plymouth',
  'Quito',
  'Wellington',
  'Zurich',
])
export type City = typeof City.Type

export const ListboxItem = Schema.Literals([
  'Michael Bluth',
  'Lindsay Funke',
  'Gob Bluth',
  'George Michael',
  'Maeby Funke',
  'Buster Bluth',
  'Tobias Funke',
  'Lucille Bluth',
])
export type ListboxItem = typeof ListboxItem.Type

export const DemoCard = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
})

export const DemoColumn = Schema.Struct({
  id: Schema.String,
  label: Schema.String,
  cards: Schema.Array(DemoCard),
})

export const Model = Schema.Struct({
  buttonClickCount: Schema.Number,
  inputDemoValue: Schema.String,
  textareaDemoValue: Schema.String,
  fieldsetInputValue: Schema.String,
  fieldsetTextareaValue: Schema.String,
  isFieldsetCheckboxDemoChecked: Schema.Boolean,
  calendarBasicDemo: Calendar.Model,
  maybeCalendarBasicDemoSelectedDate: Schema.Option(
    FoldkitCalendar.CalendarDate,
  ),
  datePickerBasicDemo: DatePicker.Model,
  maybeDatePickerBasicDemoSelectedDate: Schema.Option(
    FoldkitCalendar.CalendarDate,
  ),
  isCheckboxBasicDemoChecked: Schema.Boolean,
  isCheckboxOptionADemoChecked: Schema.Boolean,
  isCheckboxOptionBDemoChecked: Schema.Boolean,
  comboboxDemo: Combobox.Model,
  maybeComboboxDemoSelectedCity: Schema.Option(City),
  comboboxPlacementLockDemo: Combobox.Model,
  maybeComboboxPlacementLockDemoSelectedCity: Schema.Option(City),
  comboboxNullableDemo: Combobox.Model,
  maybeComboboxNullableDemoSelectedCity: Schema.Option(City),
  comboboxMultiDemo: Combobox.Multi.Model,
  comboboxMultiDemoSelectedCities: Schema.Array(City),
  comboboxSelectOnFocusDemo: Combobox.Model,
  maybeComboboxSelectOnFocusDemoSelectedCity: Schema.Option(City),
  dialogDemo: Dialog.Model,
  dialogAnimatedDemo: Dialog.Model,
  overlayDialogDemo: Dialog.Model,
  overlayComboboxDemo: Combobox.Model,
  maybeOverlayComboboxDemoSelectedCity: Schema.Option(City),
  nestedDialogParentDemo: Dialog.Model,
  nestedDialogChildDemo: Dialog.Model,
  isDisclosureDemoOpen: Schema.Boolean,
  listboxDemo: Listbox.Model,
  maybeListboxDemoSelectedItem: Schema.Option(ListboxItem),
  listboxMultiDemo: Listbox.Multi.Model,
  listboxMultiDemoSelectedItems: Schema.Array(ListboxItem),
  listboxGroupedDemo: Listbox.Model,
  maybeListboxGroupedDemoSelectedItem: Schema.Option(Schema.String),
  menuBasicDemo: Menu.Model,
  menuAnimatedDemo: Menu.Model,
  popoverBasicDemo: Popover.Model,
  popoverAnimatedDemo: Popover.Model,
  popoverArrowDemo: Popover.Model,
  popoverNestedParentDemo: Popover.Model,
  popoverNestedChildDemo: Popover.Model,
  verticalRadioGroupDemo: RadioGroup.Model,
  verticalRadioGroupDemoValue: Schema.Option(Plan),
  horizontalRadioGroupDemo: RadioGroup.Model,
  horizontalRadioGroupDemoValue: Schema.Option(Plan),
  selectDemoValue: Schema.String,
  sliderRatingDemo: Slider.Model,
  sliderRatingValue: Schema.Number,
  sliderVolumeDemo: Slider.Model,
  sliderVolumeValue: Schema.Number,
  isSwitchDemoChecked: Schema.Boolean,
  horizontalTabsDemo: Tabs.Model,
  horizontalTabsDemoTab: DemoTab,
  verticalTabsDemo: Tabs.Model,
  verticalTabsDemoTab: DemoTab,
  dragAndDropDemo: DragAndDrop.Model,
  dragAndDropDemoColumns: Schema.Array(DemoColumn),
  fileDropBasicDemo: FileDrop.Model,
  fileDropBasicDemoFiles: Schema.Array(File.File),
  toastDemo: Toast.Model,
  maybeLastDismissedToastTitle: Schema.Option(Schema.String),
  tooltipDemo: Tooltip.Model,
  hoverIntentCardDemo: HoverIntent.Model,
  hoverIntentMenuDemo: HoverIntent.Model,
  animationDemo: Animation.Model,
  virtualListDemo: VirtualList.Model,
  virtualListVariableDemo: VirtualList.Model,
})
export type Model = typeof Model.Type
