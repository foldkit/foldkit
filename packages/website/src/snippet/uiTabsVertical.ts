// Pseudocode walkthrough — same Model, init, Message, and update as the
// basic tabs; only the view config changes to set orientation and use flex
// + flex-col for layout.
import { Ui } from 'foldkit'
import { html } from 'foldkit/html'
import { m } from 'foldkit/message'

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

// Inside your view function, set orientation to 'Vertical' and use flex +
// flex-col for layout:
const view = (model: Model) => {
  const h = html<Message>()

  return Ui.Tabs.view<Message, Framework>({
    model: model.tabs,
    toParentMessage: message => GotTabsMessage({ message }),
    tabs: frameworks,
    tabListAriaLabel: 'Framework comparison',
    orientation: 'Vertical',
    tabToConfig: (tab, { isActive }) => ({
      buttonClassName:
        'px-4 py-2 text-left rounded-l-lg border mr-[-1px] data-[selected]:bg-white data-[selected]:border-r-0',
      buttonContent: h.span([], [tab]),
      panelClassName: 'flex-1 p-6 border rounded-r-lg',
      panelContent: h.p([], [descriptions[tab]]),
    }),
    attributes: [h.Class('flex')],
    tabListAttributes: [h.Class('flex flex-col')],
  })
}
