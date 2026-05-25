// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
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
// chosen value (typed as `Framework`) and its index. Lift either to
// domain state, route, or trigger a side effect.
GotTabsMessage: ({ message }) => {
  const [nextTabs, commands, maybeOutMessage] = FrameworkTabs.update(
    model.tabs,
    message,
  )
  const mappedCommands = Command.mapMessages(commands, message =>
    GotTabsMessage({ message }),
  )

  return Option.match(maybeOutMessage, {
    onNone: () => [evo(model, { tabs: () => nextTabs }), mappedCommands],
    onSome: M.type<Ui.Tabs.OutMessage<Framework>>().pipe(
      M.tagsExhaustive({
        Selected: ({ value, index }) => [
          // The child has emitted `Selected`. The body commits the
          // child's next state as usual. In this arm the parent can
          // also update its own state or dispatch its own Commands,
          // for example route to a new URL, persist the selection,
          // or trigger a panel content fetch.
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
    slotId: 'framework-tabs',
    model: model.tabs,
    view: FrameworkTabs.view,
    viewInputs: {
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
