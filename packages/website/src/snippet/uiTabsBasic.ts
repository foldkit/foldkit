import { Effect, Schema as S } from 'effect'
import { Command, Ui } from 'foldkit'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Class, div, p, span } from './html'

// MODEL

const Model = S.Struct({
  tabs: Ui.Tabs.Model,
})

// INIT

const init = () => [{ tabs: Ui.Tabs.init({ id: 'framework-tabs' }) }, []]

// MESSAGE

const GotTabsMessage = m('GotTabsMessage', {
  message: Ui.Tabs.Message,
})

// UPDATE

GotTabsMessage: ({ message }) => {
  const [nextTabs, commands] = Ui.Tabs.update(model.tabs, message)

  return [
    evo(model, { tabs: () => nextTabs }),
    commands.map(
      Command.mapEffect(Effect.map(message => GotTabsMessage({ message }))),
    ),
  ]
}

// VIEW

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
