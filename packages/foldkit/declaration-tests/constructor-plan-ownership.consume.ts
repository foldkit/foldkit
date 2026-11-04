import { Effect, Layer } from 'effect'
import * as Block from 'foldkit/block'
import * as Story from 'foldkit/story'

import {
  ConditionalBlock,
  ContextualBlock,
  CounterBlock,
  GraphBuildError,
  GraphSettings,
  HeadlessBlock,
  Message,
  Model,
  RequiredBlock,
  contextualUpdate,
  makeCounter,
} from './constructor-plan-ownership.accepted.js'

type Assert<Condition extends true> = Condition
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

export type ExactConstructorRequirements = Assert<
  Equal<Layer.Services<typeof RequiredBlock.layer>, GraphSettings>
>
export type ExactConstructorError = Assert<
  Equal<Layer.Error<typeof RequiredBlock.layer>, GraphBuildError>
>

export const counter = Story.withBlock(CounterBlock, block =>
  block.update(block.init().model, Message.ClickedIncrement()),
)
export const conditional = Story.withBlock(ConditionalBlock, block =>
  block.update(block.init().model, Message.ClickedIncrement()),
)
export const headless = Story.withBlock(HeadlessBlock, block =>
  block.update(block.init().model, Message.ClickedIncrement()),
)
export const generic = Story.withBlock(makeCounter(2), block =>
  block.update(block.init().model, Message.ClickedIncrement()),
)
export const contextual = Story.withBlock(ContextualBlock, block => {
  const initial = block.init()
  const incremented = block.update(initial.model, Message.ClickedIncrement())
  const labeled = block.update(
    incremented.model,
    Message.ClickedIncrement(),
    2,
    'counter',
  )

  // @ts-expect-error The optional dispatch context retains its number type.
  block.update(labeled.model, Message.ClickedIncrement(), 'two')
  // @ts-expect-error Rest dispatch context retains its string element type.
  block.update(labeled.model, Message.ClickedIncrement(), 2, 3)

  return block.update(labeled.model, Message.ClickedIncrement(), 3, 'counter')
})

type OutputOf<Value> = Value extends Block.Plan<infer Output> ? Output : never
declare const applyContextualUpdate: OutputOf<typeof contextualUpdate>

export const applyContextual = (model: Model) => {
  const incremented = applyContextualUpdate(model, Message.ClickedIncrement())
  const labeled = applyContextualUpdate(
    incremented.model,
    Message.ClickedIncrement(),
    2,
    'counter',
  )

  // @ts-expect-error Direct plan application retains optional dispatch context types.
  applyContextualUpdate(labeled.model, Message.ClickedIncrement(), 'two')
  // @ts-expect-error Curried plan application retains rest dispatch context types.
  applyContextualUpdate(Message.ClickedIncrement())(labeled.model, 2, 3)

  return applyContextualUpdate(Message.ClickedIncrement())(
    labeled.model,
    3,
    'counter',
  )
}
export const provided = Story.withBlock(RequiredBlock, block =>
  block.init(),
).pipe(Effect.provide(Layer.succeed(GraphSettings, { isUnavailable: false })))
