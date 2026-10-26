import { Number, Schema } from 'effect'
import { Block, Update } from 'foldkit'
import { type FieldTransforms, modifyFields } from 'foldkit/struct'

export const Model = Schema.Struct({
  count: Schema.Number,
  label: Schema.String,
  status: Schema.Literals(['Idle', 'Ready']),
})
export const FieldStepsDefinition = Block.makeDefinition('FieldSteps', {
  Model,
  Message: Schema.Never,
})
export const ApplicationDefinition = Block.makeDefinition('Application', {
  Model,
  Message: Schema.Never,
})
export const incrementStep = FieldStepsDefinition.makeFieldsStep(() => ({
  count: Number.increment,
}))
export const readyStep = FieldStepsDefinition.makeFieldsStep(model => ({
  label: () => `${model.label}: ready`,
  status: () => 'Ready',
}))
export const preserveStep = FieldStepsDefinition.makeNoopStep()
export const applicationIncrementStep = ApplicationDefinition.makeFieldsStep(
  () => ({
    count: Number.increment,
  }),
)
export const combinedStep = Update.combineSteps([
  incrementStep,
  applicationIncrementStep,
])
export const extractedTransforms: FieldTransforms<typeof Model.Type> = {
  count: Number.increment,
  label: label => `${label}: edited`,
}
export const transformedModel = modifyFields(
  Model.make({ count: 0, label: '', status: 'Idle' }),
  extractedTransforms,
)
export const editFieldsStep = <
  const Fields extends FieldTransforms<typeof Model.Type>,
>(
  fields: Fields &
    Record<Exclude<keyof Fields, keyof typeof Model.Type>, never>,
) =>
  FieldStepsDefinition.makeFieldsStep(model =>
    model.status === 'Ready' ? fields : {},
  )
export const guardedIncrement = editFieldsStep({ count: count => count + 1 })
export const FieldStepsComposition = FieldStepsDefinition.makeComposition()
const prepareFieldStepsBlock = () =>
  FieldStepsComposition.prepareBlock({
    init: FieldStepsComposition.makeInit(() => ({
      model: { count: 0, label: '', status: 'Idle' },
    })),
    update: FieldStepsComposition.makeUpdate({}),
  })
export const FieldStepsBlock: Block.FromAssemblyWithoutViewOrOutMessage<
  typeof Model,
  typeof prepareFieldStepsBlock
> = Block.assemble(prepareFieldStepsBlock)
export const VariantModel = Schema.Union([
  Schema.Struct({
    _tag: Schema.Literal('Number'),
    id: Schema.String,
    value: Schema.Number,
  }),
  Schema.Struct({
    _tag: Schema.Literal('Flag'),
    id: Schema.String,
    isEnabled: Schema.Boolean,
  }),
])
export const VariantFieldStepsDefinition = Block.makeDefinition(
  'VariantFieldSteps',
  { Model: VariantModel, Message: Schema.Never },
)
export const renameVariantStep = VariantFieldStepsDefinition.makeFieldsStep(
  () => ({
    id: () => 'next',
  }),
)
export const TextFieldStepsDefinition = Block.makeDefinition('TextFieldSteps', {
  Model: Schema.String,
  Message: Schema.Never,
})
export const preserveTextStep = TextFieldStepsDefinition.makeNoopStep()

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type RefinedStatus = Expect<
  Equal<ReturnType<typeof readyStep>['model']['status'], 'Ready'>
>
export type NoCommands = Expect<
  Equal<Update.RequirementsOf<typeof combinedStep>, never>
>
export type ExactArguments = Expect<
  Equal<Parameters<typeof incrementStep>, [model: typeof Model.Type]>
>
