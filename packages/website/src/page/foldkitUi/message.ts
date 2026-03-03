import { Schema as S } from 'effect'
import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

export const GotDialogDemoMessage = m('GotDialogDemoMessage', {
  message: Ui.Dialog.Message,
})
export const GotDisclosureDemoMessage = m(
  'GotDisclosureDemoMessage',
  {
    message: Ui.Disclosure.Message,
  },
)
export const GotListboxDemoMessage = m('GotListboxDemoMessage', {
  message: Ui.Listbox.Message,
})
export const GotListboxMultiDemoMessage = m(
  'GotListboxMultiDemoMessage',
  {
    message: Ui.Listbox.Message,
  },
)
export const GotListboxGroupedDemoMessage = m(
  'GotListboxGroupedDemoMessage',
  {
    message: Ui.Listbox.Message,
  },
)
export const GotMenuBasicDemoMessage = m('GotMenuBasicDemoMessage', {
  message: Ui.Menu.Message,
})
export const GotMenuAnimatedDemoMessage = m(
  'GotMenuAnimatedDemoMessage',
  {
    message: Ui.Menu.Message,
  },
)
export const GotPopoverBasicDemoMessage = m(
  'GotPopoverBasicDemoMessage',
  {
    message: Ui.Popover.Message,
  },
)
export const GotPopoverAnimatedDemoMessage = m(
  'GotPopoverAnimatedDemoMessage',
  {
    message: Ui.Popover.Message,
  },
)
export const GotSwitchDemoMessage = m('GotSwitchDemoMessage', {
  message: Ui.Switch.Message,
})
export const GotHorizontalTabsDemoMessage = m(
  'GotHorizontalTabsDemoMessage',
  {
    message: Ui.Tabs.Message,
  },
)
export const GotVerticalTabsDemoMessage = m(
  'GotVerticalTabsDemoMessage',
  {
    message: Ui.Tabs.Message,
  },
)

export const Message = S.Union(
  GotDialogDemoMessage,
  GotDisclosureDemoMessage,
  GotListboxDemoMessage,
  GotListboxMultiDemoMessage,
  GotListboxGroupedDemoMessage,
  GotMenuBasicDemoMessage,
  GotMenuAnimatedDemoMessage,
  GotPopoverBasicDemoMessage,
  GotPopoverAnimatedDemoMessage,
  GotSwitchDemoMessage,
  GotHorizontalTabsDemoMessage,
  GotVerticalTabsDemoMessage,
)
export type Message = typeof Message.Type
