import { Schema } from 'effect'
import * as Block from 'foldkit/block'

import { TabsNamespace } from './namespace.js'
import {
  InitConfig,
  Message,
  Model,
  OutMessage,
  type ViewInputs,
} from './types.js'

/** @internal Stable identity of the Tabs contract. */
export const TabsKey = Symbol('Tabs')
/** @internal Canonical Tabs authoring contracts. */
export const TabsBlock = Block.make(TabsNamespace, {
  key: TabsKey,
  Model,
  Message,
  OutMessage,
  InitArgs: Schema.Tuple([InitConfig]),
  view: {
    kind: 'Element',
    Inputs: Block.makeInputContract<ViewInputs>(),
  },
})
