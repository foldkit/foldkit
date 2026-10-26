import { Block, Message, Update } from 'foldkit'

import {
  ComposedInitDefinition,
  LocalMessage,
  Model,
  init,
  prepareStep,
} from './composed-init.accepted.js'
import { ReadCount } from './generated-dispatch.accepted.js'

// @ts-expect-error The initializer retains its exact boolean argument.
init('ready')

// @ts-expect-error Standalone Steps return results rather than another Step.
Update.defineStep((_model: typeof Model.Type) => prepareStep)

// @ts-expect-error Standalone Steps cannot return a curried composition.
Update.defineStep((_model: typeof Model.Type) =>
  Update.combineSteps([prepareStep, prepareStep]),
)

Update.combineSteps(Model.make({ child: { count: 0 }, isReady: false }), [
  // @ts-expect-error Raw nested Step callbacks cannot enter a composition.
  () => prepareStep,
  prepareStep,
])

const OutMessage = Message.defineMessageUnion({ Prepared: {} })
const ComposedInitOutMessageDefinition = Block.makeDefinition(
  'ComposedInitOutMessage',
  {
    Model,
    Message: LocalMessage,
    OutMessage,
  },
)
const outMessageStep = ComposedInitOutMessageDefinition.makeStep(model => ({
  model,
  outMessage: OutMessage.Prepared(),
}))

ComposedInitOutMessageDefinition.makeComposition().makeInit(() => ({
  model: Model.make({ child: { count: 0 }, isReady: false }),
  // @ts-expect-error Initializers have no receiver for a Step's OutMessage.
  steps: [outMessageStep],
}))

ComposedInitDefinition.makeStep(model => ({
  model,
  // @ts-expect-error A Definition cannot consume a foreign result Message.
  commands: [ReadCount()],
}))
