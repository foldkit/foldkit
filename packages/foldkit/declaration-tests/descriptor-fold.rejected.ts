import { Effect } from 'effect'
import { Command } from 'foldkit'

import {
  FoldParityChildDefinition,
  FoldParityParentDefinition,
  conditionalFold,
  connectedFold,
  contextFold,
} from './descriptor-fold.accepted.js'
import {
  ChildMessage,
  ChildOutMessage,
  Model,
} from './outmessage-fold.accepted.js'

const makeFold = FoldParityParentDefinition.makeOutMessageFold
const ChildBlock = FoldParityChildDefinition.contract

// @ts-expect-error Every child OutMessage variant still requires a named branch.
export const missingVariant = makeFold(ChildBlock, {
  Chose: () => FoldParityParentDefinition.makeNoopStep(),
})

// @ts-expect-error Normalization cannot replace the owning Model with another shape.
export const wrongModel = makeFold(ChildBlock, {
  Chose: () => () => ({ model: { unexpected: true } }),
  Closed: () => FoldParityParentDefinition.makeNoopStep(),
})

const ForeignCommand = Command.define('DescriptorFoldForeignCommand', {
  messages: [ChildMessage.RequestedClose],
  handler: function* () {
    return () => Effect.succeed(ChildMessage.RequestedClose())
  },
})
// @ts-expect-error A foreign Command result does not join the parent Message contract.
export const wrongCommand = makeFold(ChildBlock, {
  Chose: () => model => ({ model, commands: [ForeignCommand()] }),
  Closed: () => FoldParityParentDefinition.makeNoopStep(),
})

// @ts-expect-error The child payload remains its exact Choice union.
export const wrongPayload = conditionalFold({ _tag: 'Chose', value: 'Banana' })

// @ts-expect-error A declared FoldContext cannot disappear from the normalized helper.
export const missingContext = contextFold(
  ChildOutMessage.Chose({ value: 'Pear' }),
)

declare const model: typeof Model.Type
const chooseConnected = connectedFold(ChildOutMessage.Chose({ value: 'Pear' }))
// @ts-expect-error Connected results still require the original registered graph on their Model input.
export const missingGraph = chooseConnected(model)
