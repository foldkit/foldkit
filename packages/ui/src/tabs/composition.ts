import { makeDefinition } from './definition.js'
import { init as initFields } from './init.js'
import type { ValueSchema } from './types.js'
import { makeUpdateHandlers } from './update.js'
import { makeView } from './view.js'

/** @internal Authors a Tabs implementation for one selected-value Schema. */
export const makeAuthoring = <Value extends string, ValueEncoded>(
  Value: ValueSchema<Value, ValueEncoded>,
) => {
  const Definition = makeDefinition(Value)
  const Composition = Definition.makeComposition()
  const init = Composition.makeInit(initFields)
  const update = Composition.makeUpdate(
    makeUpdateHandlers(Definition.Message, Definition.OutMessage),
  )
  const render = makeView(Definition.Message)
  const view = Composition.makeView.withInputs((model, viewInputs, h) =>
    render(model, viewInputs, h),
  )

  return { Definition, init, update, view }
}
