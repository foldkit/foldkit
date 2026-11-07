import { Schema } from 'effect'
import { Block } from 'foldkit'

import { RoomsClient } from '../../rpc'
import { Message, OutMessage } from './message'
import { Model } from './model'

export const HomeKey = Symbol('Home')
export const HomeBlock = Block.make('Home', {
  key: HomeKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: { services: [RoomsClient] },
  Model,
  Message,
  OutMessage,
})

export const {
  makeCommand,
  makeCommandsStep,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageStep,
  makeSubscriptions,
} = HomeBlock
