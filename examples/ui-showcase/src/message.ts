import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Toast } from './toast'

export const GotTransitionDemoMessage = m('GotTransitionDemoMessage', {
  message: Ui.Transition.Message,
})
export const ToggledTransitionDemo = m('ToggledTransitionDemo')

export const GotMobileMenuDialogMessage = m('GotMobileMenuDialogMessage', {
  message: Ui.Dialog.Message,
})
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
    message: Ui.Checkbox.Message,
  },
)
export const GotCheckboxBasicDemoMessage = m('GotCheckboxBasicDemoMessage', {
  message: Ui.Checkbox.Message,
})
export const GotCheckboxAllDemoMessage = m('GotCheckboxAllDemoMessage', {
  message: Ui.Checkbox.Message,
})
export const GotCheckboxOptionADemoMessage = m(
  'GotCheckboxOptionADemoMessage',
  {
    message: Ui.Checkbox.Message,
  },
)
export const GotCheckboxOptionBDemoMessage = m(
  'GotCheckboxOptionBDemoMessage',
  {
    message: Ui.Checkbox.Message,
  },
)
export const GotComboboxDemoMessage = m('GotComboboxDemoMessage', {
  message: Ui.Combobox.Message,
})
export const GotComboboxNullableDemoMessage = m(
  'GotComboboxNullableDemoMessage',
  {
    message: Ui.Combobox.Message,
  },
)
export const GotComboboxMultiDemoMessage = m('GotComboboxMultiDemoMessage', {
  message: Ui.Combobox.Message,
})
export const GotComboboxSelectOnFocusDemoMessage = m(
  'GotComboboxSelectOnFocusDemoMessage',
  {
    message: Ui.Combobox.Message,
  },
)
export const GotDialogDemoMessage = m('GotDialogDemoMessage', {
  message: Ui.Dialog.Message,
})
export const GotDialogAnimatedDemoMessage = m('GotDialogAnimatedDemoMessage', {
  message: Ui.Dialog.Message,
})
export const GotDisclosureDemoMessage = m('GotDisclosureDemoMessage', {
  message: Ui.Disclosure.Message,
})
export const GotListboxDemoMessage = m('GotListboxDemoMessage', {
  message: Ui.Listbox.Message,
})
export const GotListboxMultiDemoMessage = m('GotListboxMultiDemoMessage', {
  message: Ui.Listbox.Message,
})
export const GotListboxGroupedDemoMessage = m('GotListboxGroupedDemoMessage', {
  message: Ui.Listbox.Message,
})
export const GotMenuBasicDemoMessage = m('GotMenuBasicDemoMessage', {
  message: Ui.Menu.Message,
})
export const GotMenuAnimatedDemoMessage = m('GotMenuAnimatedDemoMessage', {
  message: Ui.Menu.Message,
})
export const GotPopoverBasicDemoMessage = m('GotPopoverBasicDemoMessage', {
  message: Ui.Popover.Message,
})
export const GotPopoverAnimatedDemoMessage = m(
  'GotPopoverAnimatedDemoMessage',
  {
    message: Ui.Popover.Message,
  },
)
export const GotVerticalRadioGroupDemoMessage = m(
  'GotVerticalRadioGroupDemoMessage',
  {
    message: Ui.RadioGroup.Message,
  },
)
export const GotHorizontalRadioGroupDemoMessage = m(
  'GotHorizontalRadioGroupDemoMessage',
  {
    message: Ui.RadioGroup.Message,
  },
)
export const GotSwitchDemoMessage = m('GotSwitchDemoMessage', {
  message: Ui.Switch.Message,
})
export const UpdatedSelectDemoValue = m('UpdatedSelectDemoValue', {
  value: S.String,
})
export const GotHorizontalTabsDemoMessage = m('GotHorizontalTabsDemoMessage', {
  message: Ui.Tabs.Message,
})
export const GotVerticalTabsDemoMessage = m('GotVerticalTabsDemoMessage', {
  message: Ui.Tabs.Message,
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
  message: Ui.Tooltip.Message,
})
export const GotTooltipNoDelayDemoMessage = m('GotTooltipNoDelayDemoMessage', {
  message: Ui.Tooltip.Message,
})

export const UiMessage = S.Union(
  GotMobileMenuDialogMessage,
  ClickedButtonDemo,
  GotTransitionDemoMessage,
  ToggledTransitionDemo,
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
  GotDisclosureDemoMessage,
  GotListboxDemoMessage,
  GotListboxMultiDemoMessage,
  GotListboxGroupedDemoMessage,
  GotMenuBasicDemoMessage,
  GotMenuAnimatedDemoMessage,
  GotPopoverBasicDemoMessage,
  GotPopoverAnimatedDemoMessage,
  GotVerticalRadioGroupDemoMessage,
  GotHorizontalRadioGroupDemoMessage,
  UpdatedSelectDemoValue,
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
)
export type UiMessage = typeof UiMessage.Type
