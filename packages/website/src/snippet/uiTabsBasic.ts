import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, p, span } from './html'

// Your Model has a field for the Tabs Submodel:
const Model = S.Struct({
  tabs: Ui.Tabs.Model,
  // ...your other fields
})

// Initialize it:
const initialModel = {
  tabs: Ui.Tabs.init({ id: 'framework-tabs' }),
}

// Embed the Tabs Message in your parent Message:
const GotTabsMessage = m('GotTabsMessage', {
  message: Ui.Tabs.Message,
})

// In your update, delegate to Tabs.update:
GotTabsMessage: ({ message }) => {
  const [nextTabs, commands] = Ui.Tabs.update(model.tabs, message)

  return [
    evo(model, { tabs: () => nextTabs }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotTabsMessage({ message }))),
    ),
  ]
}

// In your view:
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
