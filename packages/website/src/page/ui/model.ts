import { Schema as S } from 'effect'
import { File, Calendar as FoldkitCalendar } from 'foldkit'

import {
  Animation,
  Calendar,
  Combobox,
  DatePicker,
  Dialog,
  DragAndDrop,
  FileDrop,
  Listbox,
  Menu,
  Popover,
  Slider,
  Tabs,
  Tooltip,
  VirtualList,
} from '@foldkit/ui'

import { Toast } from './toastModule'

export const Plan = S.Literals(['Startup', 'Business', 'Enterprise'])
export type Plan = typeof Plan.Type

export const DemoTab = S.Literals(['Foldkit', 'React', 'Elm'])
export type DemoTab = typeof DemoTab.Type

export const City = S.Literals([
  'Johannesburg',
  'Kyiv',
  'Oxford',
  'Plymouth',
  'Quito',
  'Wellington',
  'Zurich',
])
export type City = typeof City.Type

export const ListboxItem = S.Literals([
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

export const DemoCard = S.Struct({
  id: S.String,
  label: S.String,
})

export const DemoColumn = S.Struct({
  id: S.String,
  label: S.String,
  cards: S.Array(DemoCard),
})

export const Model = S.Struct({
  buttonClickCount: S.Number,
  inputDemoValue: S.String,
  textareaDemoValue: S.String,
  fieldsetInputValue: S.String,
  fieldsetTextareaValue: S.String,
  isFieldsetCheckboxDemoChecked: S.Boolean,
  calendarBasicDemo: Calendar.Model,
  maybeCalendarBasicDemoSelectedDate: S.Option(FoldkitCalendar.CalendarDate),
  datePickerBasicDemo: DatePicker.Model,
  maybeDatePickerBasicDemoSelectedDate: S.Option(FoldkitCalendar.CalendarDate),
  isCheckboxBasicDemoChecked: S.Boolean,
  isCheckboxOptionADemoChecked: S.Boolean,
  isCheckboxOptionBDemoChecked: S.Boolean,
  comboboxDemo: Combobox.Model,
  maybeComboboxDemoSelectedCity: S.Option(City),
  comboboxNullableDemo: Combobox.Model,
  maybeComboboxNullableDemoSelectedCity: S.Option(City),
  comboboxMultiDemo: Combobox.Multi.Model,
  comboboxMultiDemoSelectedCities: S.Array(City),
  comboboxSelectOnFocusDemo: Combobox.Model,
  maybeComboboxSelectOnFocusDemoSelectedCity: S.Option(City),
  dialogDemo: Dialog.Model,
  dialogAnimatedDemo: Dialog.Model,
  overlayDialogDemo: Dialog.Model,
  overlayComboboxDemo: Combobox.Model,
  maybeOverlayComboboxDemoSelectedCity: S.Option(City),
  nestedDialogParentDemo: Dialog.Model,
  nestedDialogChildDemo: Dialog.Model,
  isDisclosureDemoOpen: S.Boolean,
  listboxDemo: Listbox.Model,
  maybeListboxDemoSelectedItem: S.Option(ListboxItem),
  listboxMultiDemo: Listbox.Multi.Model,
  listboxMultiDemoSelectedItems: S.Array(ListboxItem),
  listboxGroupedDemo: Listbox.Model,
  maybeListboxGroupedDemoSelectedItem: S.Option(S.String),
  menuBasicDemo: Menu.Model,
  menuAnimatedDemo: Menu.Model,
  popoverBasicDemo: Popover.Model,
  popoverAnimatedDemo: Popover.Model,
  popoverNestedParentDemo: Popover.Model,
  popoverNestedChildDemo: Popover.Model,
  verticalRadioGroupDemoValue: S.Option(Plan),
  horizontalRadioGroupDemoValue: S.Option(Plan),
  selectDemoValue: S.String,
  sliderRatingDemo: Slider.Model,
  sliderRatingValue: S.Number,
  sliderVolumeDemo: Slider.Model,
  sliderVolumeValue: S.Number,
  isSwitchDemoChecked: S.Boolean,
  horizontalTabsDemo: Tabs.Model,
  horizontalTabsDemoTab: DemoTab,
  verticalTabsDemo: Tabs.Model,
  verticalTabsDemoTab: DemoTab,
  dragAndDropDemo: DragAndDrop.Model,
  dragAndDropDemoColumns: S.Array(DemoColumn),
  fileDropBasicDemo: FileDrop.Model,
  fileDropBasicDemoFiles: S.Array(File.File),
  toastDemo: Toast.Model,
  maybeLastDismissedToastTitle: S.Option(S.String),
  tooltipDemo: Tooltip.Model,
  animationDemo: Animation.Model,
  virtualListDemo: VirtualList.Model,
  virtualListVariableDemo: VirtualList.Model,
})
export type Model = typeof Model.Type
