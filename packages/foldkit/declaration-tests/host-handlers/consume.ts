import { Effect, Layer } from 'effect'
import * as Story from 'foldkit/story'

import { GraphBuildError, GraphSettings, HostBlock } from './contracts.js'
import { SelectedHostBlock } from './selected.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value

const ProvidedBlock = SelectedHostBlock.provide(
  Layer.succeed(GraphSettings, { isUnavailable: false }),
)

export type Provided = Assert<
  Equal<Layer.Services<typeof ProvidedBlock.layer>, never>
>
export type ConstructorFailure = Assert<
  Equal<Layer.Error<typeof ProvidedBlock.layer>, GraphBuildError>
>
export type CanonicalGraph = Assert<
  Equal<
    Layer.Success<typeof ProvidedBlock.layer>,
    Effect.Services<typeof HostBlock.get>
  >
>
export const pureStory = Story.withBlock(ProvidedBlock, block => {
  const initial = block.init()
  return block.update(initial.model, block.Message.ClickedReadValue())
})
export const passiveContract = Story.withBlock(HostBlock, block =>
  block.init(),
).pipe(Effect.provide(ProvidedBlock.layer))
