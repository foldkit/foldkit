import { Schema as S } from 'effect'
import { File } from 'foldkit'

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
  datePickerBasicDemo: DatePicker.Model,
  isCheckboxBasicDemoChecked: S.Boolean,
  isCheckboxOptionADemoChecked: S.Boolean,
  isCheckboxOptionBDemoChecked: S.Boolean,
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
  isDisclosureDemoOpen: S.Boolean,
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
  sliderVolumeDemo: Slider.Model,
  isSwitchDemoChecked: S.Boolean,
  horizontalTabsDemo: Tabs.Model,
  verticalTabsDemo: Tabs.Model,
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
