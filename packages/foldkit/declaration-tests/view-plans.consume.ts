import * as Block from 'foldkit/block'

import {
  ApplicationBlock,
  Composition,
  counterView,
} from './view-plans.accepted.js'

type Assert<Condition extends true> = Condition
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

export type PublicInputsRemainDeclared = Assert<
  Equal<
    Block.FactsOf<typeof ApplicationBlock>['view'],
    Block.ViewContract<{ heading: string }, 'Element'>
  >
>

export type ReflectedDefaultInputsRemainDeclared = Assert<
  Equal<
    Parameters<typeof ChildBinding.embedView>[0]['viewInputs'],
    { heading: string }
  >
>

declare const h: Block.ViewBuilderFor<typeof Composition>

const useNestedView = () => {
  counterView({ count: 0 }, { label: 'Count' }, h)

  // @ts-expect-error The helper retains its own exact input contract.
  counterView({ count: 0 }, { label: 1 }, h)
  // @ts-expect-error The helper retains the parent Model contract.
  counterView({ count: 'zero' }, { label: 'Count' }, h)
}
void useNestedView

import {
  ChildBinding,
  Model,
  foreignView,
  view,
} from './view-plans.accepted.js'

const useAlternativeView = () => {
  ChildBinding.embedView({
    slotId: 'counter',
    model: Model.make({ count: 0 }),
    view: counterView,
    viewInputs: { label: 'Counter' },
  })

  ChildBinding.embedView({
    slotId: 'counter',
    model: Model.make({ count: 0 }),
    view,
    viewInputs: { heading: 'Counter' },
  })

  const wrongInputs = {
    slotId: 'bad',
    model: Model.make({ count: 0 }),
    view: counterView,
    viewInputs: { heading: 'Counter' },
  }

  const foreignConfig = {
    slotId: 'foreign',
    model: Model.make({ count: 0 }),
    view: foreignView,
  }

  // @ts-expect-error A same-shaped foreign owner cannot author this child's alternative view.
  ChildBinding.embedView(foreignConfig)

  // @ts-expect-error An alternative view retains its own inputs after emission.
  ChildBinding.embedView(wrongInputs)
}
void useAlternativeView

import { KeyedBinding, headlessView } from './view-plans.accepted.js'

const missingKey = {
  slotId: 'child',
  model: Model.make({ count: 0 }),
  view: headlessView,
  viewInputs: { label: 'Child' },
}
const incorrectKey = { ...missingKey, key: 1 }

// @ts-expect-error A keyed alternative view still requires its Binding key.
KeyedBinding.embedView(missingKey)
// @ts-expect-error The key retains the parent Record's string contract.
KeyedBinding.embedView(incorrectKey)
