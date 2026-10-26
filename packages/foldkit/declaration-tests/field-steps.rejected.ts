import { Number } from 'effect'

import {
  ApplicationDefinition,
  FieldStepsComposition,
  FieldStepsDefinition,
  TextFieldStepsDefinition,
  VariantFieldStepsDefinition,
  editFieldsStep,
} from './field-steps.accepted.js'

// @ts-expect-error Unknown field-only records cannot be silently ignored.
FieldStepsDefinition.makeFieldsStep(() => ({ extra: () => 1 }))
// @ts-expect-error Known fields cannot hide extra keys.
FieldStepsDefinition.makeFieldsStep(() => ({
  count: Number.increment,
  extra: () => 1,
}))
FieldStepsDefinition.makeFieldsStep(() => ({
  // @ts-expect-error Field transformations preserve their input type.
  count: (value: string) => value.length,
}))
// @ts-expect-error Field transformations preserve their output type.
FieldStepsDefinition.makeFieldsStep(() => ({ count: () => 'invalid' }))
// @ts-expect-error Application-owned helpers reject unknown fields as well.
ApplicationDefinition.makeFieldsStep(() => ({ extra: () => 1 }))
// @ts-expect-error Variant tags cannot be changed while retaining incompatible fields.
VariantFieldStepsDefinition.makeFieldsStep(() => ({ _tag: () => 'Flag' }))
// @ts-expect-error Primitive Models do not have struct field transformations.
TextFieldStepsDefinition.makeFieldsStep(() => ({}))
// @ts-expect-error The no-op factory takes no arguments.
FieldStepsDefinition.makeNoopStep(() => undefined)
// @ts-expect-error The no-op checks the owning Model.
FieldStepsDefinition.makeNoopStep()({ count: 'invalid' })
// @ts-expect-error Compositions do not duplicate Definition-owned field authoring.
FieldStepsComposition.makeFieldsStep
// @ts-expect-error Compositions do not duplicate Definition-owned no-op authoring.
FieldStepsComposition.makeNoopStep

const UnknownField = Symbol('UnknownField')
// @ts-expect-error Unknown symbol fields are rejected alongside known fields.
FieldStepsDefinition.makeFieldsStep(() => ({
  count: Number.increment,
  [UnknownField]: () => 1,
}))

// @ts-expect-error Guarded field helpers reject extra literal keys.
editFieldsStep({ count: Number.increment, extra: () => 1 })
const extractedExtra = { count: Number.increment, extra: () => 1 }
// @ts-expect-error Extracting the record cannot conceal extra fields.
editFieldsStep(extractedExtra)
editFieldsStep({
  // @ts-expect-error Guarded callbacks receive the field's exact type.
  count: (value: string) => value.length,
})
// @ts-expect-error Guarded field transforms preserveStep the declared output type.
editFieldsStep({ count: () => 'invalid' })
// @ts-expect-error Extra symbol fields remain invalid through a guarded helper.
editFieldsStep({ count: Number.increment, [UnknownField]: () => 1 })
