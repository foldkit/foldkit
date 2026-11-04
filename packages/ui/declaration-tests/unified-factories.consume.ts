import { Effect } from 'effect'

import {
  type Construction,
  type ConstructionError,
  ordinaryPicker,
  pairedQuotes,
  pairedTabs,
  pairedWindows,
  providedQuotes,
  selectedPicker,
  selectedQuotes,
} from './unified-factories.accepted.js'
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false
type Assert<Value extends true> = Value
export type Checks = readonly [
  Assert<Equal<Effect.Services<typeof ordinaryPicker>, never>>,
  Assert<Equal<Effect.Services<typeof selectedPicker>, Construction>>,
  Assert<Equal<Effect.Error<typeof selectedPicker>, ConstructionError>>,
  Assert<Equal<Effect.Services<typeof pairedQuotes>, never>>,
  Assert<Equal<Effect.Services<typeof pairedWindows>, never>>,
  Assert<Equal<Effect.Services<typeof pairedTabs>, never>>,
  Assert<Equal<Effect.Services<typeof selectedQuotes>, Construction>>,
  Assert<Equal<Effect.Error<typeof selectedQuotes>, ConstructionError>>,
  Assert<Equal<Effect.Services<typeof providedQuotes>, Construction>>,
]
