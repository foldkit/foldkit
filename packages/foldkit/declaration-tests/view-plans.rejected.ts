import {
  ChildBinding,
  Model,
  counterView,
  foreignView,
} from './view-plans.accepted.js'

const foreignEmbedding = {
  slotId: 'foreign',
  model: Model.make({ count: 0 }),
  view: foreignView,
}
const wrongInputEmbedding = {
  slotId: 'wrong-inputs',
  model: Model.make({ count: 0 }),
  view: counterView,
  viewInputs: { label: 1 },
}

// @ts-expect-error The source owner is retained through passive view compilation.
ChildBinding.embedView(foreignEmbedding)
// @ts-expect-error A supplied alternate view defines its own exact Inputs.
ChildBinding.embedView(wrongInputEmbedding)

const takeDefaultViewInputs = (
  inputs: Parameters<typeof ChildBinding.embedView>[0]['viewInputs'],
) => inputs

// @ts-expect-error Reflecting the canonical overload retains its declared Inputs.
takeDefaultViewInputs({ heading: 1 })
