import { Update } from 'foldkit'

import { ChildBlock, run, update } from './policy-graph.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
export type ExactRequirements = Expect<
  Equal<Update.RequirementsOf<typeof update>, never>
>
export type ExactChildCount = Expect<
  Equal<typeof ChildBlock.Model.Type.count, number>
>
export const model = run().model
export const firstCount: number = model.b0.count
export const lastCount: number = model.b11.count
