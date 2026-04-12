import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Class, p, span } from './html'

const GotTabsMessage = m('GotTabsMessage', {
  message: Ui.Tabs.Message,
})

type Framework = 'Foldkit' | 'React' | 'Elm'
const frameworks: ReadonlyArray<Framework> = ['Foldkit', 'React', 'Elm']

const descriptions: Record<Framework, string> = {
  Foldkit: 'Model-View-Update with Effect.',
  React: 'Component-based with hooks.',
  Elm: 'The original MVU architecture.',
}

// In your view, set orientation to 'Vertical' and use flex + flex-col for layout:
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
