// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Match as M, Option } from 'effect'
import { Command } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'
import { evo } from 'foldkit/struct'

import { Tabs } from '@foldkit/ui'

const Framework = S.Literals(['Foldkit', 'React', 'Elm'])
type Framework = typeof Framework.Type

// Add fields to your Model for the Tabs Submodel and the active tab. The
// Submodel keeps private keyboard-focus state; the parent owns the active
// tab value and passes it back in as selectedValue.
const Model = S.Struct({
  tabs: Tabs.Model,
  activeFramework: Framework,
  // ...your other fields
})

// In your init function, initialize the Tabs Submodel with a unique id and
// pick the starting active tab:
const init = () => [
  {
    tabs: Tabs.init({ id: 'framework-tabs' }),
    activeFramework: 'Foldkit',
    // ...your other fields
  },
  [],
]

// Embed the Tabs Message in your parent Message:
const GotTabsMessage = m('GotTabsMessage', {
  message: Tabs.Message,
})

// Declare a typed Tabs factory once at module scope. The Value generic
// types tab.value in toView so the consumer can switch on it without
// casting:
const FrameworkTabs = Tabs.create<Framework>()

const frameworks: ReadonlyArray<Framework> = ['Foldkit', 'React', 'Elm']

const descriptions: Record<Framework, string> = {
  Foldkit: 'Model-View-Update with Effect.',
  React: 'Component-based with hooks.',
  Elm: 'The original MVU architecture.',
}

// Inside your update function's M.tagsExhaustive({...}), delegate to
// FrameworkTabs.update. The OutMessage's `Selected` carries the chosen
// value (typed as `Framework`) and its index. Fold the value into your
// own Model so it flows back in as selectedValue.
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
    onSome: M.type<Tabs.OutMessage<Framework>>().pipe(
      M.tagsExhaustive({
        Selected: ({ value }) => [
          // The child has emitted `Selected`. Commit the child's next
          // interaction state and store the selected value as the new
          // active tab. In this arm the parent can also update its own
          // state or dispatch Commands, for example route to a new URL,
          // persist the selection, or trigger a panel content fetch.
          evo(model, {
            tabs: () => nextTabs,
            activeFramework: () => value,
          }),
          mappedCommands,
        ],
      }),
    ),
  })
}

// Inside your view function, embed the tabs via h.submodel and pass the
// parent-owned active tab as selectedValue:
const view = (model: Model) => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'framework-tabs',
    model: model.tabs,
    view: FrameworkTabs.view,
    viewInputs: {
      tabs: frameworks,
      selectedValue: model.activeFramework,
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
