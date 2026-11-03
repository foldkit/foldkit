import { Context, Effect, Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import * as Update from 'foldkit/update'

import type { PlanOutput } from '../../../packages/foldkit/src/experimental/hybrid/authoring.js'
import type { ChannelsOf } from './authoring.js'
import {
  ApplicationDefinition,
  Message,
  Model,
  OutMessage,
  makeNoopStep,
} from './domain.js'
import { baseUpdate, inputCases, labelCases, updates } from './parts.js'

export class Storage extends Context.Service<
  Storage,
  {
    readonly save: (count: number) => Effect.Effect<void>
  }
>()('UpdateComposition/Storage') {}

export const Save = ApplicationDefinition.makeCommand('Save', {
  args: { count: Schema.Number },
  messages: [Message.CompletedSave],
  handler: function* () {
    const storage = yield* Storage

    return ({ count }) =>
      storage.save(count).pipe(Effect.as(Message.CompletedSave()))
  },
})

export const saveCases = updates.cases({
  ChangedCount: (model, { count }) => ({
    model,
    commands: [Save({ count })],
    outMessage: OutMessage.Saved({ count }),
  }),
})

export const completion = updates.cases({ CompletedSave: makeNoopStep() })
export const update = updates.compose(
  saveCases,
  labelCases,
  completion,
  baseUpdate,
)

export const saveAfter = updates.on(['ChangedCount'])(model => ({
  model,
  commands: [Save({ count: model.count })],
}))

export const secondEmitter = updates.cases({
  ChangedCount: model => ({
    model,
    outMessage: OutMessage.Saved({ count: model.count }),
  }),
})

export const labelEmitter = updates.cases({
  ChangedLabel: model => ({
    model,
    outMessage: OutMessage.Saved({ count: model.count }),
  }),
})

export const disjointEmitters = updates.compose(
  saveCases,
  labelEmitter,
  completion,
  baseUpdate,
  saveAfter,
)

export const overlappingSilentCases = updates.compose(
  inputCases,
  saveCases,
  labelCases,
  completion,
  baseUpdate,
)

updates.compose(
  // @ts-expect-error Two potentially emitting stages cannot handle the same tag.
  saveCases,
  secondEmitter,
  labelCases,
  completion,
  baseUpdate,
)

type Equal<A, B> =
  (<Value>() => Value extends A ? 1 : 2) extends <Value>() => Value extends B
    ? 1
    : 2
    ? true
    : false
type Expect<Condition extends true> = Condition

export type ExactSaveRequirements = Expect<
  Equal<
    Update.RequirementsOf<PlanOutput<typeof update>>,
    Command.HandlerOf<typeof Save>
  >
>

export type CountChannels = Expect<
  Equal<
    Extract<
      ChannelsOf<PlanOutput<typeof update>>,
      readonly ['ChangedCount', unknown, unknown, unknown]
    >,
    readonly [
      'ChangedCount',
      typeof OutMessage.Saved.Type,
      Command.HandlerOf<typeof Save>,
      never,
    ]
  >
>

export type SilentLabelChannels = Expect<
  Equal<
    Extract<
      ChannelsOf<PlanOutput<typeof update>>,
      readonly ['ChangedLabel', unknown, unknown, unknown]
    >,
    readonly ['ChangedLabel', never, never, never]
  >
>

export type SilentCompletionChannels = Expect<
  Equal<
    Extract<
      ChannelsOf<PlanOutput<typeof update>>,
      readonly ['CompletedSave', unknown, unknown, unknown]
    >,
    readonly ['CompletedSave', never, never, never]
  >
>

export type HandlerKeepsStorage = Expect<
  Equal<import('effect').Layer.Services<typeof Save.layer>, Storage>
>

export const ForeignMessage = defineMessageUnion({ CompletedForeignSave: {} })
export const ForeignKey = Symbol('Foreign')
export const ForeignDefinition = Block.makeDefinition('Foreign', {
  key: ForeignKey,
  Model,
  Message: ForeignMessage,
  Init: Schema.Tuple([]),
})
export const ForeignSave = ForeignDefinition.makeCommand('ForeignSave', {
  messages: [ForeignMessage.CompletedForeignSave],
})

// @ts-expect-error Shared Commands must produce only this graph's declared Messages.
updates.each(model => ({ model, commands: [ForeignSave()] }))

updates.cases({
  // @ts-expect-error Sparse local cases keep the same Command payload validation as makeUpdate.
  ChangedCount: model => ({ model, commands: [ForeignSave()] }),
})

declare const erasedResult: any

// @ts-expect-error Shared producers cannot erase their result channels.
updates.each(() => erasedResult)

const repeatedEmitters: ReadonlyArray<typeof secondEmitter> = [secondEmitter]
// @ts-expect-error Unbounded record stages may repeat a competing OutMessage.
updates.compose(baseUpdate, saveCases, ...repeatedEmitters)
