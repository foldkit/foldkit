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

import { Toast } from './toast'

export const Plan = S.Literals(['Startup', 'Business', 'Enterprise'])
export type Plan = typeof Plan.Type

export const DemoCard = S.Struct({
  id: S.String,
  label: S.String,
})
export type DemoCard = typeof DemoCard.Type

export const DemoColumn = S.Struct({
  id: S.String,
  label: S.String,
  cards: S.Array(DemoCard),
})
export type DemoColumn = typeof DemoColumn.Type

export const UiModel = S.Struct({
  mobileMenuDialog: Dialog.Model,
  buttonClickCount: S.Number,
  inputDemoValue: S.String,
  textareaDemoValue: S.String,
  fieldsetInputValue: S.String,
  fieldsetTextareaValue: S.String,
  fieldsetCheckboxDemo: S.Boolean,
  calendarBasicDemo: Calendar.Model,
  datePickerBasicDemo: DatePicker.Model,
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
  disclosureBasicDemo: S.Boolean,
  disclosureAnimatedDemo: S.Boolean,
  dragAndDropDemo: DragAndDrop.Model,
  dragAndDropDemoColumns: S.Array(DemoColumn),
  fileDropBasicDemo: FileDrop.Model,
  fileDropBasicDemoFiles: S.Array(File.File),
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
  switchDemo: S.Boolean,
  horizontalTabsDemo: Tabs.Model,
  verticalTabsDemo: Tabs.Model,
  toastDemo: Toast.Model,
  tooltipBasicDemo: Tooltip.Model,
  tooltipNoDelayDemo: Tooltip.Model,
  animationDemo: Animation.Model,
  isAnimationDemoShowing: S.Boolean,
  virtualListDemo: VirtualList.Model,
  virtualListVariableDemo: VirtualList.Model,
})
export type UiModel = typeof UiModel.Type
