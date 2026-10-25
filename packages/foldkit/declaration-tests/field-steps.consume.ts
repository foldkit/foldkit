import { Schema } from 'effect'
import { Update } from 'foldkit'
import type { FieldTransforms } from 'foldkit/struct'

import {
  Model,
  combined,
  editFields,
  guardedIncrement,
  preserve,
  preserveText,
  ready,
} from './field-steps.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

const ExtendedModel = Schema.Struct({ ...Model.fields, extra: Schema.Boolean })
const model = ExtendedModel.make({
  count: 1,
  label: '',
  status: 'Idle',
  extra: true,
})
const preserved = preserve(model)

export type PreservedRefinement = Expect<
  Equal<typeof preserved.model, typeof ExtendedModel.Type>
>
export type EmittedStatus = Expect<
  Equal<ReturnType<typeof ready>['model']['status'], 'Ready'>
>
export type EmittedArguments = Expect<
  Equal<Parameters<typeof ready>, [model: typeof Model.Type]>
>
export type EmittedRequirements = Expect<
  Equal<Update.RequirementsOf<typeof combined>, never>
>
export type EmittedChannels = Expect<
  Equal<keyof ReturnType<typeof ready>, 'model' | 'commands' | 'outMessage'>
>

preserveText('ready')
// @ts-expect-error A primitive no-op still checks its owning Model.
preserveText(1)
const result = ready(model)
export type AbsentCommands = Expect<Equal<typeof result.commands, undefined>>
export type AbsentOutMessage = Expect<
  Equal<typeof result.outMessage, undefined>
>

const fields: FieldTransforms<typeof Model.Type> = {
  count: count => count + 1,
}
editFields(fields)
export type GuardedRequirements = Expect<
  Equal<Update.RequirementsOf<typeof guardedIncrement>, never>
>
export type GuardedModel = Expect<
  Equal<ReturnType<typeof guardedIncrement>['model'], typeof Model.Type>
>
// @ts-expect-error Emitted field helpers reject extra record properties.
editFields({ count: count => count + 1, extra: () => 1 })
const extra = { count: (count: number) => count + 1, extra: () => 1 }
// @ts-expect-error Emitted field helpers retain validation for extracted records.
editFields(extra)
// @ts-expect-error Emitted field helpers reject an incompatible output.
editFields({ count: () => 'wrong' })
