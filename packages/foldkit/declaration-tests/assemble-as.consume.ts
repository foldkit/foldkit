import {
  assembled,
  counterChecked,
  inferred,
  reporterChecked,
} from './assemble-as.accepted.js'

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Expect<Value extends true> = Value
type IsAny<Value> = 0 extends 1 & Value ? true : false

type Checked = typeof assembled
type Inferred = typeof inferred
export type CheckedNotAny = Expect<Equal<IsAny<Checked>, false>>
export type SameKeys = Expect<Equal<keyof Checked, keyof Inferred>>
export type SameUpdate = Expect<Equal<Checked['update'], Inferred['update']>>
export type SameInit = Expect<Equal<Checked['init'], Inferred['init']>>
export type SameEffectsLayer = Expect<
  Equal<Checked['EffectsLayer'], Inferred['EffectsLayer']>
>
export type CounterNotAny = Expect<Equal<IsAny<typeof counterChecked>, false>>
export type ReporterNotAny = Expect<Equal<IsAny<typeof reporterChecked>, false>>
