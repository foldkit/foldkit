import { Schema, Tuple } from 'effect'
import * as Block from 'foldkit/block'

import { InMessage, InitConfig, Message, Model, OutMessage } from './schema.js'
import type { ViewInputs } from './types.js'

/** @internal Stable identity of the Animation contract. */
export const AnimationKey = Symbol('Animation')
/** @internal Animation authoring contracts and helpers. */
export const AnimationBlock = Block.make('Animation', {
  key: AnimationKey,
  Model,
  Message,
  InMessage,
  OutMessage,
  InitArgs: Schema.Tuple([InitConfig]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  operations: {
    requestFinish: {
      message: (generation: number) =>
        Tuple.make(Message.RequestedFinish({ generation })),
      outMessage: OutMessage.TransitionedOut,
    },
  },
})

/** Public Animation authoring contract and passive graph identity. */
export type AnimationBlock = typeof AnimationBlock
