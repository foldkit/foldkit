import { Effect, Layer, Schema } from 'effect'
import { Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { Tabs } from '@foldkit/ui'
import type { RenderInfo as TabsRenderInfo } from '@foldkit/ui/tabs'

const Framework = Schema.Literals(['Foldkit', 'React', 'Elm'])
type Framework = typeof Framework.Type

const FrameworkTabs = Tabs.makeBlock<Framework>()

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

export const FrameworkPickerLive = FrameworkPicker.make(
  Effect.fn(function* () {
    const tabs = yield* new FrameworkTabs('tabs', { id: 'framework-tabs' })

    return {
      model: { tabs, activeFramework: 'Foldkit' },

      update: {
        // Store the selected value so it flows back in as `selectedValue`
        ...tabs.on({
          Selected: (model, { value }) => ({
            model: modifyFields(model, { activeFramework: () => value }),
          }),
        }),
      },

      view: (model, h) => {
        const tabsView = ({
          tablist,
          tabs,
          activeIndex,
        }: TabsRenderInfo<Framework>) =>
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
          )

        return model.tabs.view({
          tabs: frameworks,
          selectedValue: model.activeFramework,
          ariaLabel: 'Framework comparison',
          toView: tabsView,
        })
      },
    }
  }),
).pipe(Layer.provide(FrameworkTabs.Live))
