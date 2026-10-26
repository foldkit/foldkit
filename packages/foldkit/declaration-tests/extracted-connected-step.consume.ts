import { Update } from 'foldkit'

import { changeCount, update } from './extracted-connected-step.accepted.js'
import {
  OutMessage,
  ParentModel,
  parentUpdate,
} from './record-update.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type ExactOutMessage = Expect<
  Equal<
    NonNullable<ReturnType<typeof update>['outMessage']>,
    typeof OutMessage.Type
  >
>
export type ExactModel = Expect<
  Equal<ReturnType<typeof update>['model'], typeof ParentModel.Type>
>
export type ExactRequirements = Expect<
  Equal<
    Update.RequirementsOf<typeof update>,
    Update.RequirementsOf<typeof parentUpdate>
  >
>
export type LocalTransformationAddsNoCommands = Expect<
  Equal<Update.RequirementsOf<ReturnType<typeof changeCount>>, never>
>
export type ExactTransformer = Expect<
  Equal<Parameters<typeof changeCount>, [toCount: (count: number) => number]>
>

const model = ParentModel.make({ child: { count: 0 }, count: 0 })
// @ts-expect-error Emission retains the required registered graph on the input.
changeCount(count => count + 1)(model)
// @ts-expect-error Emission retains the exact owning field type.
changeCount(() => 'wrong')
