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
  fieldsetCheckboxDemo: S.Boolean,
  calendarBasicDemo: Calendar.Model,
  calendarBasicDemoSelectedDate: S.Option(FoldkitCalendar.CalendarDate),
  datePickerBasicDemo: DatePicker.Model,
  datePickerBasicDemoSelectedDate: S.Option(FoldkitCalendar.CalendarDate),
  checkboxBasicDemo: S.Boolean,
  checkboxOptionADemo: S.Boolean,
  checkboxOptionBDemo: S.Boolean,
  comboboxDemo: Combobox.Model,
  comboboxNullableDemo: Combobox.Model,
  comboboxMultiDemo: Combobox.Multi.Model,
  comboboxSelectOnFocusDemo: Combobox.Model,
  dialogDemo: Dialog.Model,
  dialogAnimatedDemo: Dialog.Model,
  overlayDialogDemo: Dialog.Model,
  overlayComboboxDemo: Combobox.Model,
  nestedDialogParentDemo: Dialog.Model,
  nestedDialogChildDemo: Dialog.Model,
  disclosureDemo: S.Boolean,
  listboxDemo: Listbox.Model,
  listboxMultiDemo: Listbox.Multi.Model,
  listboxGroupedDemo: Listbox.Model,
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
  switchDemo: S.Boolean,
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
