// Pseudocode walkthrough using the same Model, init, Message, and update
// as the basic tabs; only the view config changes to set orientation and
// use flex + flex-col for layout.
import { Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'

const GotTabsMessage = m('GotTabsMessage', {
  message: Ui.Tabs.Message,
})

type Framework = 'Foldkit' | 'React' | 'Elm'
const FrameworkTabs = Ui.Tabs.create<Framework>()
const frameworks: ReadonlyArray<Framework> = ['Foldkit', 'React', 'Elm']

const descriptions: Record<Framework, string> = {
  Foldkit: 'Model-View-Update with Effect.',
  React: 'Component-based with hooks.',
  Elm: 'The original MVU architecture.',
}

// Inside your view function, set orientation to 'Vertical' and use flex +
// flex-col for layout:
const view = (model: Model) => {
  const h = html<Message>()

  return h.submodel({
    slotId: 'framework-tabs',
    model: model.tabs,
    view: FrameworkTabs.view,
    viewInputs: {
      tabs: frameworks,
      ariaLabel: 'Framework comparison',
      orientation: 'Vertical',
      toView: ({ tablist, tabs, activeIndex }) =>
        h.div(
          [h.Class('flex')],
          [
            h.div(
              [...tablist, h.Class('flex flex-col')],
              tabs.map(tab =>
                h.button(
                  [
                    ...tab.tab,
                    h.Class(
                      'px-4 py-2 text-left rounded-l-lg border mr-[-1px] data-[selected]:bg-white data-[selected]:border-r-0',
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
                  [...tab.panel, h.Class('flex-1 p-6 border rounded-r-lg')],
                  [h.p([], [descriptions[tab.value]])],
                ),
              ),
          ],
        ),
    },
    toParentMessage: message => GotTabsMessage({ message }),
  })
}
