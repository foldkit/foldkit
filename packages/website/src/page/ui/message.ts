import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

export const ClickedButtonDemo = m('ClickedButtonDemo')
export const UpdatedInputDemoValue = m('UpdatedInputDemoValue', {
  value: S.String,
})
export const UpdatedTextareaDemoValue = m('UpdatedTextareaDemoValue', {
  value: S.String,
})
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
export const GotHorizontalTabsDemoMessage = m('GotHorizontalTabsDemoMessage', {
  message: Ui.Tabs.Message,
})
export const GotVerticalTabsDemoMessage = m('GotVerticalTabsDemoMessage', {
  message: Ui.Tabs.Message,
})

export const Message = S.Union(
  ClickedButtonDemo,
  UpdatedInputDemoValue,
  UpdatedTextareaDemoValue,
  GotCheckboxBasicDemoMessage,
  GotCheckboxAllDemoMessage,
  GotCheckboxOptionADemoMessage,
  GotCheckboxOptionBDemoMessage,
  GotComboboxDemoMessage,
  GotComboboxNullableDemoMessage,
  GotComboboxMultiDemoMessage,
  GotComboboxSelectOnFocusDemoMessage,
  GotDialogDemoMessage,
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
  GotSwitchDemoMessage,
  GotHorizontalTabsDemoMessage,
  GotVerticalTabsDemoMessage,
)
export type Message = typeof Message.Type
