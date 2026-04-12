import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Class, p, span } from './html'

const GotTabsMessage = m('GotTabsMessage', {
  message: Ui.Tabs.Message,
})

// Init with no special config — orientation is set in the view
//   tabs: Ui.Tabs.init({ id: 'vertical-tabs' })

Ui.Tabs.view<Message, Framework>({
  model: model.tabs,
  toParentMessage: message => GotTabsMessage({ message }),
  tabs: frameworks,
  tabListAriaLabel: 'Framework comparison',
  orientation: 'Vertical',
  tabToConfig: (tab, { isActive }) => ({
    buttonClassName:
      'px-4 py-2 text-left rounded-l-lg border mr-[-1px] data-[selected]:bg-white data-[selected]:border-r-0',
    buttonContent: span([], [tab]),
    panelClassName: 'flex-1 p-6 border rounded-r-lg',
    panelContent: p([], [descriptions[tab]]),
  }),
  attributes: [Class('flex')],
  tabListAttributes: [Class('flex flex-col')],
})
