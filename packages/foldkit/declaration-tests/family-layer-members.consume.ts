import { Model, Resolved } from './family-layer-members.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value

export type ModelContract = Expect<Equal<typeof Resolved.Model.Type, Model>>
export type ConvenienceContract = Expect<
  Equal<Parameters<typeof Resolved.readValue>, [model: Model]>
>
export const selected: Model = Resolved.readValue(4)
