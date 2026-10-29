// Pseudocode walkthrough of the Foldkit integration points. Each labeled
// block below is an excerpt. Fit them into your own Model, init, Message,
// update, and view definitions.
import { Schema, Tuple } from 'effect'
import { Block } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { Tabs } from '@foldkit/ui'
import type { RenderInfo as TabsRenderInfo } from '@foldkit/ui/tabs'

const Framework = Schema.Literals(['Foldkit', 'React', 'Elm'])
type Framework = typeof Framework.Type

const FrameworkTabs = Tabs.makeBlock<Framework>()

// Add fields to your Model for the Tabs Block and the active tab. The
// Block keeps private keyboard-focus state; the parent owns the active
// tab value and passes it back in as selectedValue.
const Model = Schema.Struct({
  tabs: FrameworkTabs.Model,
  activeFramework: Framework,
  // ...your other fields
})
type Model = typeof Model.Type
// This excerpt has no parent-owned facts. The Composition derives delivery.
const Message = defineMessageUnion({})
type Message = typeof Message.Type

const TabsExampleDefinition = Block.makeDefinition('TabsExample', {
  Model,
  Message,
})

const { makeFieldsStep } = TabsExampleDefinition

const frameworks: ReadonlyArray<Framework> = ['Foldkit', 'React', 'Elm']

const descriptions: Record<Framework, string> = {
  Foldkit: 'Model-View-Update with Effect.',
  React: 'Component-based with hooks.',
  Elm: 'The original MVU architecture.',
}

// At module scope, fold the OutMessage into your own Model. `Selected`
// carries the chosen value (typed as `Framework`) and its index. Fold the
// value into your own Model so it flows back in as selectedValue. The arm
// returns an Update.Step over the parent Model, which already has the next
// Tabs Model written back. Passing the whole child lets the parent Definition
// infer the refined `Framework` OutMessage and parent Step:
const foldTabsOutMessage = TabsExampleDefinition.makeOutMessageFold(
  FrameworkTabs,
  {
    // The child has emitted `Selected`. Store the selected value as the new
    // active tab. In this arm the parent can also update its own state or
    // dispatch Commands, for example route to a new URL, persist the
    // selection, or trigger a panel content fetch.
    Selected: ({ value }) =>
      makeFieldsStep(() => ({
        activeFramework: () => value,
      })),
  },
)

// The Binding wires the completed child Block into the parent: it runs
// FrameworkTabs.update, writes the next Tabs Model back, maps the Block's
// Commands into your Message type, and hands any OutMessage to
// the OutMessage fold.
const TabsBinding = TabsExampleDefinition.makeBinding(FrameworkTabs, {
  field: 'tabs',
  init: { contextToArgs: () => Tuple.make({ id: 'framework-tabs' }) },
}).withOutMessagePolicy({ fold: foldTabsOutMessage })

const TabsExampleComposition = TabsExampleDefinition.makeComposition({
  bindings: [TabsBinding],
})

// In your init function, initialize the Tabs Block with a unique id and
// pick the starting active tab:
const init = TabsExampleComposition.makeInit(() => ({
  model: {
    activeFramework: 'Foldkit',
    // ...your other fields
  },
}))

const update = TabsExampleComposition.makeUpdate({})

// Inside your view function, embed the tabs via h.block and pass the
// parent-owned active tab as selectedValue:
const view = TabsExampleComposition.makeView((model, h) => {
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

  return h.block(
    TabsBinding.embedView({
      slotId: 'framework-tabs',
      model: model.tabs,
      viewInputs: {
        tabs: frameworks,
        selectedValue: model.activeFramework,
        ariaLabel: 'Framework comparison',
        toView: tabsView,
      },
    }),
  )
})
