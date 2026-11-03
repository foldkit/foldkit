import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import * as Update from 'foldkit/update'

import { makeComposableUpdates, type RowsOf } from './authoring.js'
import { Message, Model, OutMessage } from './domain.js'

export const ChildModel = Schema.Struct({ value: Schema.Number })
export type ChildModel = typeof ChildModel.Type
export const ChildMessage = defineMessageUnion({ Pinged: {} })
export type ChildMessage = typeof ChildMessage.Type
export const ChildOutMessage = defineMessageUnion({
  Notified: { value: Schema.Number },
})
export type ChildOutMessage = typeof ChildOutMessage.Type
export const ChildKey = Symbol('Child')
export const ChildDefinition = Block.makeDefinition('Child', {
  key: ChildKey,
  Model: ChildModel,
  Message: ChildMessage,
  OutMessage: ChildOutMessage,
  Init: Schema.Tuple([]),
  operations: {
    requestPing: {
      message: ChildMessage.Pinged,
      outMessage: ChildOutMessage.Notified,
    },
  },
})
export const ChildBlock = ChildDefinition.contract

export const ParentModel = Schema.Struct({
  ...Model.fields,
  child: ChildBlock.Model,
  anotherChild: ChildBlock.Model,
})
export type ParentModel = typeof ParentModel.Type
export const ParentKey = Symbol('Parent')
export const ParentDefinition = Block.makeDefinition('Parent', {
  key: ParentKey,
  Model: ParentModel,
  Message,
  OutMessage,
  Init: Schema.Tuple([]),
})

export const ChildBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
}).withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(ChildBlock, {
    Notified: ({ value }) =>
      ParentDefinition.makeFieldsStep(() => ({ count: () => value })),
  }),
})

export const EmittingChildBinding = ParentDefinition.makeBinding(ChildBlock, {
  field: 'child',
}).withOutMessagePolicy({
  fold: ParentDefinition.makeOutMessageFold(ChildBlock, {
    Notified: ({ value }) =>
      ParentDefinition.makeStep(model => ({
        model,
        outMessage: OutMessage.Saved({ count: value }),
      })),
  }),
})

export const ParentComposition = ParentDefinition.makeComposition({
  bindings: [ChildBinding],
})
export const updates = makeComposableUpdates(ParentComposition)

export const ordinaryUpdate = ParentComposition.makeUpdate({
  ChangedCount: model => ChildBinding.requestPing()(model),
  ChangedLabel: model => ({ model }),
  CompletedSave: model => ({ model }),
})
export const ordinaryCanonicalBranch = ParentComposition.makeUpdate({
  ChangedCount: model =>
    model.count > 0
      ? ChildBinding.requestPing()(model)
      : ParentDefinition.makeNoopStep()(model),
  ChangedLabel: model => ({ model }),
  CompletedSave: model => ({ model }),
})

export const pingChild = updates.each(() => ChildBinding.requestPing())
export const canonicalBranch = updates.each(model =>
  model.count > 0
    ? ChildBinding.requestPing()
    : ParentDefinition.makeNoopStep(),
)

export const appliedCanonicalBranch = updates.each(model =>
  model.count > 0
    ? ChildBinding.requestPing()(model)
    : ParentDefinition.makeNoopStep()(model),
)

export const selectedAppliedCanonicalBranch = updates.on(['ChangedCount'])(
  model =>
    model.count > 0
      ? ChildBinding.requestPing()(model)
      : ParentDefinition.makeNoopStep()(model),
)

export const excludedAppliedCanonicalBranch = updates.except(['ChangedLabel'])(
  model =>
    model.count > 0
      ? ChildBinding.requestPing()(model)
      : ParentDefinition.makeNoopStep()(model),
)

// @ts-expect-error A raw result beside a connected result must use a canonical Step helper.
updates.each(model =>
  model.count > 0 ? ChildBinding.requestPing()(model) : { model },
)

export const watchChild = updates.each((model, message, { before }) => {
  if (message._tag === 'GotChildMessage') {
    const value = message.message._tag
    return {
      model: modifyFields(model, { label: () => `${before.label}:${value}` }),
    }
  }

  return { model }
})

export const emittingUpdates = makeComposableUpdates(
  ParentDefinition.makeComposition({ bindings: [EmittingChildBinding] }),
)

// @ts-expect-error A connected operation's parent policy emits an OutMessage.
emittingUpdates.each(() => EmittingChildBinding.requestPing())

// @ts-expect-error combineSteps cannot hide a connected policy's OutMessage.
emittingUpdates.each(() =>
  Update.combineSteps([
    EmittingChildBinding.requestPing(),
    ParentDefinition.makeNoopStep(),
  ]),
)

updates.each((model, message) => {
  if (message._tag === 'GotChildMessage') {
    // @ts-expect-error The generated wrapper retains the child's exact Message payload.
    const invalid = message.message.value
    return { model: modifyFields(model, { label: () => String(invalid) }) }
  }

  return { model }
})

// @ts-expect-error Selectors target local Messages, never generated child envelopes.
updates.on(['GotChildMessage'])(model => ({ model }))

export const ForeignKey = Symbol('ForeignParent')
export const ForeignDefinition = Block.makeDefinition('ForeignParent', {
  key: ForeignKey,
  Model: ParentModel,
  Message,
  OutMessage,
  Init: Schema.Tuple([]),
})
export const ForeignBinding = ForeignDefinition.makeBinding(ChildBlock, {
  field: 'anotherChild',
}).withOutMessagePolicy({
  fold: ForeignDefinition.makeOutMessageFold(ChildBlock, {
    Notified: ForeignDefinition.makeNoopStep,
  }),
})
export const ForeignComposition = ForeignDefinition.makeComposition({
  bindings: [ForeignBinding],
})
export const foreignUpdate = ForeignComposition.makeUpdate({
  ChangedCount: model => ({ model }),
  ChangedLabel: model => ({ model }),
  CompletedSave: model => ({ model }),
})

// @ts-expect-error Structurally equal Models do not authorize an unregistered child operation.
updates.each(() => ForeignBinding.requestPing())

// @ts-expect-error A complete anchor from a different Definition cannot join this graph.
updates.compose(foreignUpdate)

type Expect<Condition extends true> = Condition
export type ConnectedRegistrationPreserved = Expect<
  [RowsOf<typeof pingChild>[3]] extends [never] ? false : true
>
