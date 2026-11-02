import { Schema } from 'effect'
import { Block } from 'foldkit'

import { RoomsClient } from '../../rpc'
import { Message, OutMessage } from './message'
import { Model } from './model'

export const HomeKey = Symbol('Home')
export const HomeDefinition = Block.makeDefinition('Home', {
  key: HomeKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: { services: [RoomsClient] },
  Model,
  Message,
  OutMessage,
})

export const {
  makeCommandsStep,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageStep,
} = HomeDefinition
