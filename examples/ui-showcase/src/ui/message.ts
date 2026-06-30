import { Schema as S } from 'effect'
import { m } from 'foldkit/message'

import {
  Animation,
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
  Slider,
  Switch,
  Tabs,
  Tooltip,
  VirtualList,
} from '@foldkit/ui'

import { Toast } from './toast'

export const GotAnimationDemoMessage = m('GotAnimationDemoMessage', {
  message: Animation.Message,
})
export const ToggledAnimationDemo = m('ToggledAnimationDemo')

export const GotMobileMenuDialogMessage = m('GotMobileMenuDialogMessage', {
  message: Dialog.Message,
})
export const ClickedOpenMobileMenu = m('ClickedOpenMobileMenu')
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
export const GotFieldsetCheckboxDemoMessage = m(
  'GotFieldsetCheckboxDemoMessage',
  {
    message: Checkbox.Message,
  },
)
export const GotCheckboxBasicDemoMessage = m('GotCheckboxBasicDemoMessage', {
  message: Checkbox.Message,
})
export const GotCheckboxAllDemoMessage = m('GotCheckboxAllDemoMessage', {
  message: Checkbox.Message,
})
export const GotCheckboxOptionADemoMessage = m(
  'GotCheckboxOptionADemoMessage',
  {
    message: Checkbox.Message,
  },
)
export const GotCheckboxOptionBDemoMessage = m(
  'GotCheckboxOptionBDemoMessage',
  {
    message: Checkbox.Message,
  },
)
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
export const GotDisclosureBasicDemoMessage = m(
  'GotDisclosureBasicDemoMessage',
  {
    message: Disclosure.Message,
  },
)
export const GotDisclosureAnimatedDemoMessage = m(
  'GotDisclosureAnimatedDemoMessage',
  {
    message: Disclosure.Message,
  },
)
export const GotCalendarBasicDemoMessage = m('GotCalendarBasicDemoMessage', {
  message: Calendar.Message,
})
export const GotDatePickerBasicDemoMessage = m(
  'GotDatePickerBasicDemoMessage',
  {
    message: DatePicker.Message,
  },
)
export const GotDragAndDropDemoMessage = m('GotDragAndDropDemoMessage', {
  message: DragAndDrop.Message,
})
export const GotFileDropBasicDemoMessage = m('GotFileDropBasicDemoMessage', {
  message: FileDrop.Message,
})
export const ClickedRemoveFileDropDemoFile = m(
  'ClickedRemoveFileDropDemoFile',
  { fileIndex: S.Number },
)
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
export const GotVerticalRadioGroupDemoMessage = m(
  'GotVerticalRadioGroupDemoMessage',
  {
    message: RadioGroup.Message,
  },
)
export const GotHorizontalRadioGroupDemoMessage = m(
  'GotHorizontalRadioGroupDemoMessage',
  {
    message: RadioGroup.Message,
  },
)
export const GotSliderRatingDemoMessage = m('GotSliderRatingDemoMessage', {
  message: Slider.Message,
})
export const GotSliderVolumeDemoMessage = m('GotSliderVolumeDemoMessage', {
  message: Slider.Message,
})
export const GotSwitchDemoMessage = m('GotSwitchDemoMessage', {
  message: Switch.Message,
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
export const GotToastDemoMessage = m('GotToastDemoMessage', {
  message: Toast.Message,
})
export const ClickedShowInfoToast = m('ClickedShowInfoToast')
export const ClickedShowSuccessToast = m('ClickedShowSuccessToast')
export const ClickedShowWarningToast = m('ClickedShowWarningToast')
export const ClickedShowErrorToast = m('ClickedShowErrorToast')
export const ClickedShowStickyToast = m('ClickedShowStickyToast')
export const ClickedDismissAllToasts = m('ClickedDismissAllToasts')

export const GotTooltipBasicDemoMessage = m('GotTooltipBasicDemoMessage', {
  message: Tooltip.Message,
})
export const GotTooltipNoDelayDemoMessage = m('GotTooltipNoDelayDemoMessage', {
  message: Tooltip.Message,
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

export const UiMessage = S.Union([
  GotMobileMenuDialogMessage,
  ClickedOpenMobileMenu,
  ClickedButtonDemo,
  GotAnimationDemoMessage,
  ToggledAnimationDemo,
  UpdatedInputDemoValue,
  UpdatedTextareaDemoValue,
  UpdatedFieldsetInputValue,
  UpdatedFieldsetTextareaValue,
  GotFieldsetCheckboxDemoMessage,
  GotCheckboxBasicDemoMessage,
  GotCheckboxAllDemoMessage,
  GotCheckboxOptionADemoMessage,
  GotCheckboxOptionBDemoMessage,
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
  GotDisclosureBasicDemoMessage,
  GotDisclosureAnimatedDemoMessage,
  GotCalendarBasicDemoMessage,
  GotDatePickerBasicDemoMessage,
  GotDragAndDropDemoMessage,
  GotFileDropBasicDemoMessage,
  ClickedRemoveFileDropDemoFile,
  GotListboxDemoMessage,
  GotListboxMultiDemoMessage,
  GotListboxGroupedDemoMessage,
  GotMenuBasicDemoMessage,
  GotMenuAnimatedDemoMessage,
  GotPopoverBasicDemoMessage,
  GotPopoverAnimatedDemoMessage,
  GotPopoverNestedParentDemoMessage,
  GotPopoverNestedChildDemoMessage,
  GotVerticalRadioGroupDemoMessage,
  GotHorizontalRadioGroupDemoMessage,
  UpdatedSelectDemoValue,
  GotSliderRatingDemoMessage,
  GotSliderVolumeDemoMessage,
  GotSwitchDemoMessage,
  GotHorizontalTabsDemoMessage,
  GotVerticalTabsDemoMessage,
  GotToastDemoMessage,
  ClickedShowInfoToast,
  ClickedShowSuccessToast,
  ClickedShowWarningToast,
  ClickedShowErrorToast,
  ClickedShowStickyToast,
  ClickedDismissAllToasts,
  GotTooltipBasicDemoMessage,
  GotTooltipNoDelayDemoMessage,
  GotVirtualListDemoMessage,
  ClickedVirtualListScrollToMiddle,
  GotVirtualListVariableDemoMessage,
  ClickedVirtualListVariableScrollToMiddle,
])
export type UiMessage = typeof UiMessage.Type
