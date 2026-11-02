import type { Effect } from 'effect'
import type * as Block from 'foldkit/block'

import { TabsDefinition } from './definition.js'
import type { OutMessage, OutMessageSchema, ViewInputs } from './types.js'

type CanonicalContract = typeof TabsDefinition.contract
type CanonicalFacts = Block.FactsOf<CanonicalContract>

type RefinedFacts<Value extends string> = Omit<
  CanonicalFacts,
  'view' | 'update'
> &
  Readonly<{
    view: Block.ViewContract<ViewInputs<Value>, 'Element'>
    update: Block.ResultContract<
      OutMessage<Value>,
      CanonicalFacts['update']['requirements']
    >
  }>

type RefinedContract<Value extends string> = Block.Contract<
  CanonicalContract['owner'],
  CanonicalContract['Model'],
  CanonicalContract['Message'],
  OutMessageSchema<Value>,
  RefinedFacts<Value>
>

/** A passive Tabs contract refined to its controlled Value type. */
export interface Completed<Value extends string = string> extends Omit<
  RefinedContract<Value>,
  'get'
> {
  readonly get: Effect.Effect<
    Effect.Success<RefinedContract<Value>['get']>,
    never,
    Effect.Services<CanonicalContract['get']>
  >
}

/** Creates a typed Tabs contract; provide Tabs.layer when constructing its graph. */
export const makeBlock = <Value extends string = string>(): Completed<Value> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  TabsDefinition.contract as unknown as Completed<Value>

export {
  ActivationMode,
  InitConfig,
  Orientation,
  PanelMount,
  type ViewInputs,
  type RenderInfo,
  type TabInfo,
} from './types.js'
