import { Schema } from 'effect'
import { Socket } from 'effect/socket'
import * as Block from 'foldkit/block'

import { ChildInitContext } from './childInitContext'
import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'
import { RoomStartup } from './roomStartup'

export const ChatRoomKey = Symbol('ChatRoom')
export const ChatRoomDefinition = Block.makeDefinition('ChatRoom', {
  key: ChatRoomKey,
  Model,
  Message,
  InMessage,
  ChildInitContext,
  Init: Schema.Tuple([RoomStartup]),
  view: { kind: 'Element' },
  effects: {
    services: [Socket.WebSocketConstructor],
  },
})

export const ChatRoomContract = ChatRoomDefinition.contract

export const {
  makeBlock,
  makeBinding,
  makeComposition,
  makeOutMessageFold,
  makeFieldsStep,
  makeCommandsStep,
  makeNoopStep,
  makeStep,
} = ChatRoomDefinition
