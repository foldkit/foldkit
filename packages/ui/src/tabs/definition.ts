import { Schema } from 'effect'
import * as Block from 'foldkit/block'
import * as BlockFamily from 'foldkit/internal/block'

import { TabsNamespace } from './namespace.js'
import {
  InitConfig,
  type MessageSchema,
  Model,
  type OutMessageSchema,
  type ValueSchema,
  type ViewInputs,
  makeMessage,
  makeOutMessage,
} from './types.js'

/** @internal Stable identity of the Tabs family. */
export const TabsKey = Symbol('Tabs')

/** @internal Declares the selected value's complete serialization contract. */
export const makeDefinition = <Value extends string, ValueEncoded>(
  Value: ValueSchema<Value, ValueEncoded>,
) => {
  const Message: MessageSchema<Value, ValueEncoded> = makeMessage(Value)
  const OutMessage: OutMessageSchema<Value, ValueEncoded> =
    makeOutMessage(Value)

  return BlockFamily.makeFamilyDeclaration(TabsNamespace, {
    key: TabsKey,
    Model,
    Message,
    OutMessage,
    InitArgs: Schema.Tuple([InitConfig]),
    view: {
      kind: 'Element',
      Inputs: Block.makeInputContract<ViewInputs<Value>>(),
    },
  })
}
