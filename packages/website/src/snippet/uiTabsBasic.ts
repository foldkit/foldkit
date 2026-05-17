// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Effect } from 'effect'
import { Command, Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

// Add a field to your Model for the Tabs Submodel:
const Model = S.Struct({
  tabs: Ui.Tabs.Model,
  // ...your other fields
})

// In your init function, initialize the Tabs Submodel with a unique id:
const init = () => [
  {
    tabs: Ui.Tabs.init({ id: 'framework-tabs' }),
    // ...your other fields
  },
  [],
]

// Embed the Tabs Message in your parent Message:
const GotTabsMessage = m('GotTabsMessage', {
  message: Ui.Tabs.Message,
})

// Inside your update function's M.tagsExhaustive({...}), delegate to Tabs.update:
GotTabsMessage: ({ message }) => {
  const [nextTabs, commands] = Ui.Tabs.update(model.tabs, message)

  return [
    // Merge the next state into your Model:
    evo(model, { tabs: () => nextTabs }),
    // Forward the Submodel's Commands through your parent Message:
    commands.map(
      Command.mapEffect(Effect.map(message => GotTabsMessage({ message }))),
    ),
  ]
}

type Framework = 'Foldkit' | 'React' | 'Elm'
const frameworks: ReadonlyArray<Framework> = ['Foldkit', 'React', 'Elm']

const descriptions: Record<Framework, string> = {
  Foldkit: 'Model-View-Update with Effect.',
  React: 'Component-based with hooks.',
  Elm: 'The original MVU architecture.',
}

// Inside your view function, render the tabs:
const view = () => {
  const h = html<Message>()

  return Ui.Tabs.view<Message, Framework>({
    model: model.tabs,
    toParentMessage: message => GotTabsMessage({ message }),
    tabs: frameworks,
    tabListAriaLabel: 'Framework comparison',
    tabToConfig: (tab, { isActive }) => ({
      buttonClassName:
        'px-4 py-2 rounded-t-lg border data-[selected]:bg-white data-[selected]:border-b-0',
      buttonContent: h.span([], [tab]),
      panelClassName: 'p-6 border rounded-b-lg',
      panelContent: h.p([], [descriptions[tab]]),
    }),
    tabListAttributes: [h.Class('flex')],
  })
}
