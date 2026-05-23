// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt — fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option } from 'effect'
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

// Declare a typed Tabs factory once at module scope. The Value generic
// types tab.value in toView so the consumer can switch on it without
// casting:
type Framework = 'Foldkit' | 'React' | 'Elm'
const FrameworkTabs = Ui.Tabs.create<Framework>()

const frameworks: ReadonlyArray<Framework> = ['Foldkit', 'React', 'Elm']

const descriptions: Record<Framework, string> = {
  Foldkit: 'Model-View-Update with Effect.',
  React: 'Component-based with hooks.',
  Elm: 'The original MVU architecture.',
}

// Inside your update function's M.tagsExhaustive({...}), delegate to
// FrameworkTabs.update. The OutMessage's `Selected` carries both the
// chosen value (typed as `Framework`) and its index — lift either to
// domain state, route, or trigger a side effect.
GotTabsMessage: ({ message }) => {
  const [nextTabs, commands, maybeOut] = FrameworkTabs.update(
    model.tabs,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotTabsMessage({ message }),
  )

  return Option.match(maybeOut, {
    onNone: () => [evo(model, { tabs: () => nextTabs }), mappedCommands],
    onSome: M.type<Ui.Tabs.OutMessage<Framework>>().pipe(
      M.tagsExhaustive({
        Selected: ({ value, index }) => [
          // React to the tab change — e.g. fetch panel content, update
          // the URL, dispatch dependent Commands.
          evo(model, { tabs: () => nextTabs }),
          mappedCommands,
        ],
      }),
    ),
  })
}

// Inside your view function, embed the tabs via h.submodel:
const view = () => {
  const h = html<Message>()

  return h.submodel({
    id: 'framework-tabs',
    view: FrameworkTabs.view,
    model: model.tabs,
    inputs: {
      tabs: frameworks,
      ariaLabel: 'Framework comparison',
      toView: ({ tablist, tabs, activeIndex }) =>
        h.div(
          [],
          [
            h.div(
              [...tablist, h.Class('flex')],
              tabs.map(tab =>
                h.button(
                  [
                    ...tab.tab,
                    h.Class(
                      'px-4 py-2 rounded-t-lg border data-[selected]:bg-white data-[selected]:border-b-0',
                    ),
                  ],
                  [h.span([], [tab.value])],
                ),
              ),
            ),
            ...tabs
              .filter(tab => tab.index === activeIndex)
              .map(tab =>
                h.div(
                  [...tab.panel, h.Class('p-6 border rounded-b-lg')],
                  [h.p([], [descriptions[tab.value]])],
                ),
              ),
          ],
        ),
    },
    toParentMessage: message => GotTabsMessage({ message }),
  })
}
