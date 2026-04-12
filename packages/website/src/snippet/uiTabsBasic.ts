import { Ui } from 'foldkit'
import { m } from 'foldkit/message'

import { Class, div, p, span } from './html'

// Submodel wiring:
//   Model field: tabs: Ui.Tabs.Model
//   Init: Ui.Tabs.init({ id: 'framework-tabs' })
//   Update: delegate via Ui.Tabs.update

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

Ui.Tabs.view<Message, Framework>({
  model: model.tabs,
  toParentMessage: message => GotTabsMessage({ message }),
  tabs: frameworks,
  tabListAriaLabel: 'Framework comparison',
  tabToConfig: (tab, { isActive }) => ({
    buttonClassName:
      'px-4 py-2 rounded-t-lg border data-[selected]:bg-white data-[selected]:border-b-0',
    buttonContent: span([], [tab]),
    panelClassName: 'p-6 border rounded-b-lg',
    panelContent: p([], [descriptions[tab]]),
  }),
  tabListAttributes: [Class('flex')],
})
