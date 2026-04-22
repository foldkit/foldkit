import { Schema as S } from 'effect'
import { File } from 'foldkit'
import {
  Calendar,
  Checkbox,
  Combobox,
  DatePicker,
  Dialog,
  Disclosure,
  DragAndDrop,
  FileDrop,
  Listbox,
  Menu,
  Popover,
  RadioGroup,
  Switch,
  Tabs,
  Tooltip,
  Transition,
} from 'foldkit/ui'

import { Toast } from './toastModule'

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
  fieldsetCheckboxDemo: Checkbox.Model,
  calendarBasicDemo: Calendar.Model,
  datePickerBasicDemo: DatePicker.Model,
  checkboxBasicDemo: Checkbox.Model,
  checkboxOptionADemo: Checkbox.Model,
  checkboxOptionBDemo: Checkbox.Model,
  comboboxDemo: Combobox.Model,
  comboboxNullableDemo: Combobox.Model,
  comboboxMultiDemo: Combobox.Multi.Model,
  comboboxSelectOnFocusDemo: Combobox.Model,
  dialogDemo: Dialog.Model,
  dialogAnimatedDemo: Dialog.Model,
  disclosureDemo: Disclosure.Model,
  listboxDemo: Listbox.Model,
  listboxMultiDemo: Listbox.Multi.Model,
  listboxGroupedDemo: Listbox.Model,
  menuBasicDemo: Menu.Model,
  menuAnimatedDemo: Menu.Model,
  popoverBasicDemo: Popover.Model,
  popoverAnimatedDemo: Popover.Model,
  verticalRadioGroupDemo: RadioGroup.Model,
  horizontalRadioGroupDemo: RadioGroup.Model,
  selectDemoValue: S.String,
  switchDemo: Switch.Model,
  horizontalTabsDemo: Tabs.Model,
  verticalTabsDemo: Tabs.Model,
  dragAndDropDemo: DragAndDrop.Model,
  dragAndDropDemoColumns: S.Array(DemoColumn),
  fileDropBasicDemo: FileDrop.Model,
  fileDropBasicDemoFiles: S.Array(File.File),
  toastDemo: Toast.Model,
  tooltipDemo: Tooltip.Model,
  transitionDemo: Transition.Model,
})
export type Model = typeof Model.Type
