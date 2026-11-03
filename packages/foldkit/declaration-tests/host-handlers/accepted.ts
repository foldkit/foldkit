import { Effect, Layer } from 'effect'
import * as Block from 'foldkit/block'
import * as Server from 'foldkit/experimental/server'
import * as Program from 'foldkit/program'
import * as Scene from 'foldkit/scene'
import * as Story from 'foldkit/story'

import { PendingHostBlock } from './block.js'
import { ReadValue } from './command.js'
import {
  GraphBuildError,
  GraphSettings,
  HandlerBuildError,
  HostBlock,
  HostValue,
} from './contracts.js'
import { Message } from './contracts.js'
import { PlainBlock, PlainDefinition } from './plain.js'
import { HostHandlers } from './provider.js'
import { SelectedHostBlock } from './selected.js'
import {
  Family,
  FamilyHandlers,
  NativeHandlers,
  NativePending,
} from './variants.js'

export {
  Family,
  FamilyHandlers,
  NativeHandlers,
  NativePending,
} from './variants.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value

export type NoHostFactsUnchanged = Assert<
  Equal<
    Block.FactsOf<typeof PlainBlock>,
    Block.FactsOf<typeof PlainDefinition.contract>
  >
>
export type NoHostSelection = Assert<
  Equal<typeof PlainBlock.provideHandlers, never>
>
export const plainStory = Story.withBlock(PlainBlock, block => block.init())

export type SourceConstructorRequirements = Assert<
  Equal<Layer.Services<typeof SelectedHostBlock.layer>, GraphSettings>
>
export type SourceConstructorError = Assert<
  Equal<Layer.Error<typeof SelectedHostBlock.layer>, GraphBuildError>
>
export type HandlerServices = Assert<
  Equal<
    Block.FactsOf<typeof SelectedHostBlock>['effectsLayerRequirements'],
    HostValue
  >
>
export type HandlerError = Assert<
  Equal<
    Block.FactsOf<typeof SelectedHostBlock>['effectsLayerError'],
    HandlerBuildError
  >
>
export type ExactContractProvider = Assert<
  Equal<
    Layer.Success<typeof SelectedHostBlock.layer>,
    Effect.Services<typeof HostBlock.get>
  >
>
export type Selected = Assert<
  Equal<Block.FactsOf<typeof SelectedHostBlock>['hostRequirements'], never>
>
export type Missing = Assert<
  Equal<
    Block.FactsOf<typeof PendingHostBlock>['hostRequirements'] extends never
      ? true
      : false,
    false
  >
>

export const selectedProgram = Program.make({
  block: SelectedHostBlock,
  container: null,
}).provide({
  services: Layer.mergeAll(
    Layer.succeed(GraphSettings, { isUnavailable: false }),
    Layer.succeed(HostValue, { value: 'hosted', isUnavailable: false }),
  ),
})
export const pureStory = Story.withBlock(SelectedHostBlock, block => {
  block.update(block.init().model, block.Message.ClickedReadValue())
  block.operations.requestRead(block.init().model)
})
export const story = Story.story(SelectedHostBlock, Story.init())
export const scene = Scene.scene(SelectedHostBlock, Scene.init())
export const server = Server.renderToString(
  SelectedHostBlock,
  {},
  { isHydratable: false },
)
export const passiveContract = Story.withBlock(HostBlock, block =>
  block.init(),
).pipe(Effect.provide(SelectedHostBlock.layer))

declare const isFirst: boolean
export const validOrdinaryAlternative = PendingHostBlock.provideHandlers(
  isFirst
    ? HostHandlers
    : ReadValue.toLayer(
        Effect.succeed(() =>
          Effect.succeed(Message.CompletedReadValue({ value: 'other' })),
        ),
      ),
)
const InternallyProvidedHost = PendingHostBlock.provideHandlers(
  Layer.provide(
    HostHandlers,
    Layer.succeed(HostValue, { value: 'internal', isUnavailable: false }),
  ),
)
export type CanonicalEffectsBoundsRemain = Assert<
  Equal<
    Block.FactsOf<typeof InternallyProvidedHost>['effectsLayerRequirements'],
    HostValue
  >
>
export const validNativeAlternative = NativePending.provideHandlers(
  isFirst ? NativeHandlers : Layer.fresh(NativeHandlers),
)
export const validFamilyAlternative = Family.provideHandlers(
  isFirst ? FamilyHandlers : Layer.fresh(FamilyHandlers),
)
