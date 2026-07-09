import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

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

import { Plan } from './model'
import { Toast } from './toastModule'

export const ClickedButtonDemo = m('ClickedButtonDemo')
export const UpdatedInputDemoValue = m('UpdatedInputDemoValue', {
  value: S.String,
})
export const UpdatedTextareaDemoValue = m('UpdatedTextareaDemoValue', {
  value: S.String,
})
export const UpdatedFieldsetInputValue = m('UpdatedFieldsetInputValue', {
  value: S.String,
})
export const UpdatedFieldsetTextareaValue = m('UpdatedFieldsetTextareaValue', {
  value: S.String,
})
export const ToggledFieldsetCheckboxDemo = m('ToggledFieldsetCheckboxDemo', {
  isChecked: S.Boolean,
})
export const GotCalendarBasicDemoMessage = m('GotCalendarBasicDemoMessage', {
  message: Calendar.Message,
})
export const GotDatePickerBasicDemoMessage = m(
  'GotDatePickerBasicDemoMessage',
  {
    message: DatePicker.Message,
  },
)
export const ToggledCheckboxBasicDemo = m('ToggledCheckboxBasicDemo', {
  isChecked: S.Boolean,
})
export const ToggledCheckboxAllDemo = m('ToggledCheckboxAllDemo', {
  isChecked: S.Boolean,
})
export const ToggledCheckboxOptionADemo = m('ToggledCheckboxOptionADemo', {
  isChecked: S.Boolean,
})
export const ToggledCheckboxOptionBDemo = m('ToggledCheckboxOptionBDemo', {
  isChecked: S.Boolean,
})
export const GotComboboxDemoMessage = m('GotComboboxDemoMessage', {
  message: Combobox.Message,
})
export const GotComboboxNullableDemoMessage = m(
  'GotComboboxNullableDemoMessage',
  {
    message: Combobox.Message,
  },
)
export const GotComboboxMultiDemoMessage = m('GotComboboxMultiDemoMessage', {
  message: Combobox.Message,
})
export const GotComboboxSelectOnFocusDemoMessage = m(
  'GotComboboxSelectOnFocusDemoMessage',
  {
    message: Combobox.Message,
  },
)
export const GotDialogDemoMessage = m('GotDialogDemoMessage', {
  message: Dialog.Message,
})
export const GotDialogAnimatedDemoMessage = m('GotDialogAnimatedDemoMessage', {
  message: Dialog.Message,
})
export const GotOverlayDialogDemoMessage = m('GotOverlayDialogDemoMessage', {
  message: Dialog.Message,
})
export const GotOverlayComboboxDemoMessage = m(
  'GotOverlayComboboxDemoMessage',
  {
    message: Combobox.Message,
  },
)
export const GotNestedDialogParentDemoMessage = m(
  'GotNestedDialogParentDemoMessage',
  {
    message: Dialog.Message,
  },
)
export const GotNestedDialogChildDemoMessage = m(
  'GotNestedDialogChildDemoMessage',
  {
    message: Dialog.Message,
  },
)
export const ClickedDeleteProject = m('ClickedDeleteProject')
export const ClickedOpenDialog = m('ClickedOpenDialog')
export const ClickedOpenAnimatedDialog = m('ClickedOpenAnimatedDialog')
export const ClickedEditFilters = m('ClickedEditFilters')
export const ClickedOpenProjectSettings = m('ClickedOpenProjectSettings')
export const ToggledDisclosureDemo = m('ToggledDisclosureDemo', {
  isOpen: S.Boolean,
})
export const GotListboxDemoMessage = m('GotListboxDemoMessage', {
  message: Listbox.Message,
})
export const GotListboxMultiDemoMessage = m('GotListboxMultiDemoMessage', {
  message: Listbox.Message,
})
export const GotListboxGroupedDemoMessage = m('GotListboxGroupedDemoMessage', {
  message: Listbox.Message,
})
export const GotMenuBasicDemoMessage = m('GotMenuBasicDemoMessage', {
  message: Menu.Message,
})
export const GotMenuAnimatedDemoMessage = m('GotMenuAnimatedDemoMessage', {
  message: Menu.Message,
})
export const GotPopoverBasicDemoMessage = m('GotPopoverBasicDemoMessage', {
  message: Popover.Message,
})
export const GotPopoverAnimatedDemoMessage = m(
  'GotPopoverAnimatedDemoMessage',
  {
    message: Popover.Message,
  },
)
export const GotPopoverNestedParentDemoMessage = m(
  'GotPopoverNestedParentDemoMessage',
  {
    message: Popover.Message,
  },
)
export const GotPopoverNestedChildDemoMessage = m(
  'GotPopoverNestedChildDemoMessage',
  {
    message: Popover.Message,
  },
)
export const SelectedVerticalPlan = m('SelectedVerticalPlan', {
  plan: Plan,
})
export const SelectedHorizontalPlan = m('SelectedHorizontalPlan', {
  plan: Plan,
})
export const GotSliderRatingDemoMessage = m('GotSliderRatingDemoMessage', {
  message: Slider.Message,
})
export const GotSliderVolumeDemoMessage = m('GotSliderVolumeDemoMessage', {
  message: Slider.Message,
})
export const ToggledSwitchDemo = m('ToggledSwitchDemo', {
  isChecked: S.Boolean,
})
export const UpdatedSelectDemoValue = m('UpdatedSelectDemoValue', {
  value: S.String,
})
export const GotHorizontalTabsDemoMessage = m('GotHorizontalTabsDemoMessage', {
  message: Tabs.Message,
})
export const GotVerticalTabsDemoMessage = m('GotVerticalTabsDemoMessage', {
  message: Tabs.Message,
})
export const GotDragAndDropDemoMessage = m('GotDragAndDropDemoMessage', {
  message: DragAndDrop.Message,
})
export const GotFileDropBasicDemoMessage = m('GotFileDropBasicDemoMessage', {
  message: FileDrop.Message,
})
export const ClickedRemoveFileDropDemoFile = m(
  'ClickedRemoveFileDropDemoFile',
  {
    fileIndex: S.Number,
  },
)
export const GotToastDemoMessage = m('GotToastDemoMessage', {
  message: Toast.Message,
})
export const ClickedShowInfoToast = m('ClickedShowInfoToast')
export const ClickedShowSuccessToast = m('ClickedShowSuccessToast')
export const ClickedShowErrorToast = m('ClickedShowErrorToast')
export const ClickedShowStickyToast = m('ClickedShowStickyToast')
export const ClickedDismissAllToasts = m('ClickedDismissAllToasts')
export const GotTooltipDemoMessage = m('GotTooltipDemoMessage', {
  message: Tooltip.Message,
})
export const GotAnimationDemoMessage = m('GotAnimationDemoMessage', {
  message: Animation.Message,
})
export const GotVirtualListDemoMessage = m('GotVirtualListDemoMessage', {
  message: VirtualList.Message,
})
export const ClickedVirtualListScrollToMiddle = m(
  'ClickedVirtualListScrollToMiddle',
)
export const GotVirtualListVariableDemoMessage = m(
  'GotVirtualListVariableDemoMessage',
  {
    message: VirtualList.Message,
  },
)
export const ClickedVirtualListVariableScrollToMiddle = m(
  'ClickedVirtualListVariableScrollToMiddle',
)

export const Message = S.Union([
  ClickedButtonDemo,
  UpdatedInputDemoValue,
  UpdatedTextareaDemoValue,
  UpdatedFieldsetInputValue,
  UpdatedFieldsetTextareaValue,
  ToggledFieldsetCheckboxDemo,
  GotCalendarBasicDemoMessage,
  GotDatePickerBasicDemoMessage,
  ToggledCheckboxBasicDemo,
  ToggledCheckboxAllDemo,
  ToggledCheckboxOptionADemo,
  ToggledCheckboxOptionBDemo,
  GotComboboxDemoMessage,
  GotComboboxNullableDemoMessage,
  GotComboboxMultiDemoMessage,
  GotComboboxSelectOnFocusDemoMessage,
  GotDialogDemoMessage,
  GotDialogAnimatedDemoMessage,
  GotOverlayDialogDemoMessage,
  GotOverlayComboboxDemoMessage,
  GotNestedDialogParentDemoMessage,
  GotNestedDialogChildDemoMessage,
  ClickedDeleteProject,
  ClickedOpenDialog,
  ClickedOpenAnimatedDialog,
  ClickedEditFilters,
  ClickedOpenProjectSettings,
  ToggledDisclosureDemo,
  GotListboxDemoMessage,
  GotListboxMultiDemoMessage,
  GotListboxGroupedDemoMessage,
  GotMenuBasicDemoMessage,
  GotMenuAnimatedDemoMessage,
  GotPopoverBasicDemoMessage,
  GotPopoverAnimatedDemoMessage,
  GotPopoverNestedParentDemoMessage,
  GotPopoverNestedChildDemoMessage,
  SelectedVerticalPlan,
  SelectedHorizontalPlan,
  UpdatedSelectDemoValue,
  GotSliderRatingDemoMessage,
  GotSliderVolumeDemoMessage,
  ToggledSwitchDemo,
  GotHorizontalTabsDemoMessage,
  GotVerticalTabsDemoMessage,
  GotDragAndDropDemoMessage,
  GotFileDropBasicDemoMessage,
  ClickedRemoveFileDropDemoFile,
  GotToastDemoMessage,
  ClickedShowInfoToast,
  ClickedShowSuccessToast,
  ClickedShowErrorToast,
  ClickedShowStickyToast,
  ClickedDismissAllToasts,
  GotTooltipDemoMessage,
  GotAnimationDemoMessage,
  GotVirtualListDemoMessage,
  ClickedVirtualListScrollToMiddle,
  GotVirtualListVariableDemoMessage,
  ClickedVirtualListVariableScrollToMiddle,
])
export type Message = typeof Message.Type
