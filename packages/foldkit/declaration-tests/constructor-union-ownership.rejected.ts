import { Effect, Layer } from 'effect'
import type * as Block from 'foldkit/block'

import {
  CounterBlock,
  EffectsBlock,
  EffectsLayer,
  First,
  FirstBinding,
  HostBlock,
  InputBlock,
  ParentBlock,
  Second,
  SecondBinding,
  bothUpdate,
  effectsInit,
  firstBody,
  firstHandlers,
  firstHostLayer,
  firstInMessageUpdate,
  firstInit,
  firstInputBody,
  firstOnlyUpdate,
  firstParentInit,
  firstParentUpdate,
  firstUpdate,
  secondBody,
  secondHandlers,
  secondHostLayer,
  secondInMessageUpdate,
  secondInputBody,
  secondOnlyUpdate,
  secondParentInit,
  secondParentUpdate,
} from './constructor-union-ownership.accepted.js'

declare const isFirst: boolean
const crossed = isFirst
  ? { ...firstBody, inMessageUpdate: secondInMessageUpdate }
  : { ...secondBody, inMessageUpdate: firstInMessageUpdate }
const partiallyCrossed = isFirst
  ? firstBody
  : { ...secondBody, inMessageUpdate: firstInMessageUpdate }
const partiallyMissing = isFirst
  ? firstBody
  : { children: [], init: firstInit, update: firstUpdate, EffectsLayer }
type FirstInMessageUpdateOutput =
  typeof firstInMessageUpdate extends Block.Plan<
    infer Output,
    'InMessageUpdate',
    unknown
  >
    ? Output
    : never
declare const erasedInMessageUpdate: Block.Plan<
  FirstInMessageUpdateOutput,
  'InMessageUpdate',
  any
>
const erasedBody = { ...firstBody, inMessageUpdate: erasedInMessageUpdate }

// @ts-expect-error Each constructor alternative must use its own InMessage Composition.
CounterBlock.makeLayer(Effect.succeed(crossed))
// @ts-expect-error A valid alternative cannot hide another alternative's foreign InMessage plan.
CounterBlock.makeLayer(Effect.succeed(partiallyCrossed))
// @ts-expect-error Every constructor alternative needs the declared InMessage update.
CounterBlock.makeLayer(Effect.succeed(partiallyMissing))
// @ts-expect-error An erased InMessage Source cannot authenticate its Composition.
CounterBlock.makeLayer(Effect.succeed(erasedBody))

const crossedChildren = Effect.gen(function* () {
  const firstChild = yield* FirstBinding
  const secondChild = yield* SecondBinding

  return isFirst
    ? {
        children: [secondChild],
        init: firstParentInit,
        update: firstParentUpdate,
      }
    : {
        children: [firstChild],
        init: secondParentInit,
        update: secondParentUpdate,
      }
})
const partiallyMissingChildren = Effect.gen(function* () {
  const firstChild = yield* FirstBinding

  return isFirst
    ? {
        children: [firstChild],
        init: firstParentInit,
        update: firstParentUpdate,
      }
    : {
        children: [],
        init: secondParentInit,
        update: secondParentUpdate,
      }
})

// @ts-expect-error Each constructor alternative must return its own acquired connections.
ParentBlock.makeLayer(crossedChildren)
// @ts-expect-error A valid constructor alternative cannot hide another's missing connection.
ParentBlock.makeLayer(partiallyMissingChildren)

const incompleteProviders = isFirst
  ? {
      children: [],
      init: effectsInit,
      update: bothUpdate,
      EffectsLayer: First.layer,
    }
  : {
      children: [],
      init: effectsInit,
      update: bothUpdate,
      EffectsLayer: Second.layer,
    }
const incompleteProviderField = isFirst ? First.layer : Second.layer
const incompleteProviderBody = {
  children: [],
  init: effectsInit,
  update: bothUpdate,
  EffectsLayer: incompleteProviderField,
}
const crossedProviders = isFirst
  ? {
      children: [],
      init: effectsInit,
      update: firstOnlyUpdate,
      EffectsLayer: Second.layer,
    }
  : {
      children: [],
      init: effectsInit,
      update: secondOnlyUpdate,
      EffectsLayer: First.layer,
    }

// @ts-expect-error Each constructor alternative must provide all of its Command handlers.
EffectsBlock.makeLayer(Effect.succeed(incompleteProviders))
// @ts-expect-error Every alternative of an EffectsLayer field must satisfy its update.
EffectsBlock.makeLayer(Effect.succeed(incompleteProviderBody))
// @ts-expect-error One alternative's provider cannot satisfy the other alternative's update.
EffectsBlock.makeLayer(Effect.succeed(crossedProviders))

const selectedHostAlternatives = isFirst ? firstHostLayer : secondHostLayer
const mergedHandlers = Layer.mergeAll(firstHandlers, secondHandlers)

// @ts-expect-error Original handlers must match each selected implementation exactly.
HostBlock.provideHandlers(mergedHandlers)(selectedHostAlternatives)

const crossedInputProviders = isFirst
  ? {
      ...firstInputBody,
      inMessageUpdate: secondInputBody.inMessageUpdate,
    }
  : {
      ...secondInputBody,
      inMessageUpdate: firstInputBody.inMessageUpdate,
    }

// @ts-expect-error Each InMessage update needs its own matching Command provider.
InputBlock.makeLayer(Effect.succeed(crossedInputProviders))
