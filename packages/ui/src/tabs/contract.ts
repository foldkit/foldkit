import type { Schema } from 'effect'
import type * as Block from 'foldkit/block'

import type { CanonicalIdentity, TabsRefinementKey } from './block.js'
import { TabsBlock, TabsKey } from './definition.js'
import type { InitConfig } from './types.js'
import type { OutMessage, OutMessageSchema, ViewInputs } from './types.js'

type CanonicalContract = typeof TabsBlock
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

type RefinedConfiguration<Value extends string> = Readonly<{
  key: typeof TabsKey
  InitArgs: Schema.Tuple<readonly [typeof InitConfig]>
  view: Readonly<{
    kind: 'Element'
    Inputs: Block.InputContract<ViewInputs<Value>>
  }>
}>
/** @internal Names the exact private reader of this fixed-family specialization. */
export interface TabsReader<
  Value extends string,
> extends Block.ReadableProvider<
  TabsRefinementKey,
  Block.SelectedPublicIdentity<RefinedContract<Value>>
> {}

type RefinedBlock<Value extends string> = Omit<
  Block.UnifiedBlock<
    'Tabs',
    CanonicalContract['Model'],
    CanonicalContract['Message'],
    OutMessageSchema<Value>,
    undefined,
    RefinedConfiguration<Value>,
    CanonicalIdentity,
    TabsReader<Value>
  >,
  'makeLayer' | 'provideHandlers' | keyof RefinedContract<Value>
> &
  Omit<RefinedContract<Value>, 'get'>
/** A passive Tabs contract refined to its controlled Value type. */
export interface Completed<Value extends string = string>
  extends
    RefinedBlock<Value>,
    Block.FixedRefinement<
      TabsRefinementKey,
      CanonicalIdentity,
      Block.SelectedPublicIdentity<RefinedContract<Value>>
    > {}

/** Creates a typed Tabs contract; provide Tabs.layer when constructing its graph. */
export const makeBlock = <Value extends string = string>(): Completed<Value> =>
  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions */
  TabsBlock as unknown as Completed<Value>

export {
  ActivationMode,
  InitConfig,
  Orientation,
  PanelMount,
  type ViewInputs,
  type RenderInfo,
  type TabInfo,
} from './types.js'
