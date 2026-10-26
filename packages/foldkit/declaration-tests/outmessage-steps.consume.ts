import { Schema } from 'effect'
import type { Block, Update } from 'foldkit'

import {
  Model,
  OutMessage,
  OutMessageStepsBlock,
  ParentBlock,
  ParentModel,
  ParentOutMessage,
  RefinedOutMessage,
  applyToGenericModel,
  emitClosedStep,
  emitPrimitiveStep,
  emitRefinedStep,
  emitSelectedStep,
  emitUnionStep,
} from './outmessage-steps.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

const RefinedModel = Schema.Struct({
  ...Model.fields,
  status: Schema.Literal('Ready'),
  identity: Schema.Literal('Preserved'),
})
const model = RefinedModel.make({
  count: 1,
  status: 'Ready',
  identity: 'Preserved',
})
const refined = emitRefinedStep(model)
const generic = applyToGenericModel(model)
const primitive = emitPrimitiveStep('Ready')
declare const outMessage: typeof OutMessage.Type
const union = emitUnionStep(outMessage)(model)

export type EmittedOutMessageStepAssertions = readonly [
  Expect<
    Equal<
      typeof emitSelectedStep,
      Block.OutMessageStep<
        typeof Model.Type,
        typeof OutMessage.SelectedChoice.Type
      >
    >
  >,
  Expect<
    Equal<
      typeof refined.outMessage,
      typeof RefinedOutMessage.SelectedChoice.Type
    >
  >,
  Expect<Equal<typeof refined.outMessage.value, 'Apple'>>,
  Expect<Equal<typeof refined.model, typeof RefinedModel.Type>>,
  Expect<Equal<typeof generic.model, typeof RefinedModel.Type>>,
  Expect<Equal<typeof generic.outMessage, typeof refined.outMessage>>,
  Expect<Equal<typeof primitive.model, 'Ready'>>,
  Expect<Equal<typeof primitive.outMessage, 'Accepted'>>,
  Expect<Equal<typeof union.model, typeof RefinedModel.Type>>,
  Expect<Equal<typeof union.outMessage, typeof OutMessage.Type>>,
  Expect<
    Equal<
      ReturnType<typeof emitClosedStep>['outMessage'],
      typeof OutMessage.ClosedPicker.Type
    >
  >,
  Expect<Equal<Parameters<typeof emitRefinedStep>, [model: typeof Model.Type]>>,
  Expect<Equal<keyof typeof refined, 'model' | 'outMessage' | 'commands'>>,
  Expect<Equal<typeof refined.commands, undefined>>,
  Expect<Equal<keyof typeof emitRefinedStep, never>>,
  Expect<Equal<Update.RequirementsOf<typeof emitRefinedStep>, never>>,
  Expect<Equal<Update.RequirementsOf<ReturnType<typeof emitUnionStep>>, never>>,
  Expect<Equal<Update.RegistrationEvidenceOf<typeof refined>, never>>,
  Expect<Equal<Update.RegistrationEvidenceOf<typeof union>, never>>,
  Expect<
    Equal<Update.RequirementsOf<typeof OutMessageStepsBlock.update>, never>
  >,
  Expect<Equal<Update.RequirementsOf<typeof ParentBlock.update>, never>>,
  Expect<Equal<typeof ParentBlock.Model, typeof ParentModel>>,
  Expect<Equal<typeof ParentBlock.OutMessage, typeof ParentOutMessage>>,
  Expect<
    Equal<
      Exclude<ReturnType<typeof ParentBlock.update>['outMessage'], undefined>,
      typeof ParentOutMessage.Type
    >
  >,
]

// @ts-expect-error An emitted Step still checks its owning Model.
emitRefinedStep({ count: 'invalid', status: 'Idle' })
// @ts-expect-error The refined emitted OutMessage keeps its literal payload.
const widenedPayload: 'Pear' = refined.outMessage.value
void widenedPayload
