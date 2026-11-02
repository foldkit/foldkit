import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Tabs } from '@foldkit/ui'
import type { RenderInfo as TabsRenderInfo } from '@foldkit/ui/tabs'

const Framework = Schema.Literals(['Foldkit', 'React', 'Elm'])
type Framework = typeof Framework.Type

const FrameworkTabs = Tabs.make<Framework>()

const frameworks: ReadonlyArray<Framework> = ['Foldkit', 'React', 'Elm']

const descriptions: Record<Framework, string> = {
  Foldkit: 'Model-View-Update with Effect.',
  React: 'Component-based with hooks.',
  Elm: 'The original MVU architecture.',
}

// The Tabs instance keeps private keyboard-focus state. The parent owns the
// active tab and passes it back in as `selectedValue`.
export class FrameworkPicker extends Block<FrameworkPicker>()(
  'FrameworkPicker',
  {
    Model: Schema.Struct({
      tabs: FrameworkTabs,
      activeFramework: Framework,
    }),
  },
) {}

export const FrameworkPickerLive = FrameworkPicker.toLayer(() => ({
  init: () => ({
    tabs: new FrameworkTabs('tabs', { id: 'framework-tabs' }),
    activeFramework: 'Foldkit',
  }),

  update: {
    // Store the selected value so it flows back in as `selectedValue`
    ...FrameworkTabs.on({
      Selected: (model, { value }) => ({
        model: modifyFields(model, { activeFramework: () => value }),
      }),
    }),
  },

  // Set orientation to 'Vertical' and use flex + flex-col for layout
  view: (model, h) => {
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

    return model.tabs.view({
      tabs: frameworks,
      selectedValue: model.activeFramework,
      ariaLabel: 'Framework comparison',
      orientation: 'Vertical',
      toView: tabsView,
    })
  },
})).pipe(Layer.provide(FrameworkTabs))
