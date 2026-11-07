import { Schema } from 'effect'
import { KeyValueStore } from 'effect/persistence'
import { Block } from 'foldkit'

import { RoomsClient } from '../../rpc'
import { Context } from './context'
import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'

export const RoomKey = Symbol('Room')
export const RoomBlock = Block.make('Room', {
  key: RoomKey,
  InitArgs: Schema.Tuple([Schema.Option(Schema.String)]),
  Context: Schema.Tuple([Context]),
  InMessageContext: Schema.Tuple([Context]),
  view: { kind: 'Element', Inputs: Schema.Struct({ roomId: Schema.String }) },
  effects: { services: [RoomsClient, KeyValueStore.KeyValueStore] },
  Model,
  Message,
  InMessage,
})

export const {
  makeCommand,
  makeCommandsStep,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeSubscriptions,
} = RoomBlock
