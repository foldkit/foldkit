// Pseudocode walkthrough using the same Model, init, Message, and update
// as the basic tabs; only the view config changes to set orientation and
// use flex + flex-col for layout.
import { defineMessageUnion } from 'foldkit/message'

import { Tabs } from '@foldkit/ui'
import type { RenderInfo as TabsRenderInfo } from '@foldkit/ui/tabs'

const Framework = Schema.Literals(['Foldkit', 'React', 'Elm'])
type Framework = typeof Framework.Type

const FrameworkTabs = Tabs.makeBlock<Framework>()

const Message = defineMessageUnion({})
type Message = typeof Message.Type

const frameworks: ReadonlyArray<Framework> = ['Foldkit', 'React', 'Elm']

const descriptions: Record<Framework, string> = {
  Foldkit: 'Model-View-Update with Effect.',
  React: 'Component-based with hooks.',
  Elm: 'The original MVU architecture.',
}

// The parent Composition and child Binding below come from the basic walkthrough.
// Inside your view function, set orientation to 'Vertical' and use flex +
// flex-col for layout:
const view = TabsExampleComposition.makeView((model, h) => {
  const tabsView = ({
    tablist,
    tabs,
    activeIndex,
  }: TabsRenderInfo<Framework>) =>
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
    )

  return h.block(
    TabsBinding.embedView({
      slotId: 'framework-tabs',
      model: model.tabs,
      viewInputs: {
        tabs: frameworks,
        selectedValue: model.activeFramework,
        ariaLabel: 'Framework comparison',
        orientation: 'Vertical',
        toView: tabsView,
      },
    }),
  )
})
