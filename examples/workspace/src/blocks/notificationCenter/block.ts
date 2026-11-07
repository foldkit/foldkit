import { Schema } from 'effect'
import { Block } from 'foldkit'

import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'
import { ViewInputs } from './viewInputs'

export const NotificationCenterKey = Symbol('NotificationCenter')
export const NotificationCenterBlock = Block.make('NotificationCenter', {
  key: NotificationCenterKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: ViewInputs },
  Model,
  Message,
  InMessage,
  OutMessage,
})

export const {
  makeRequiredFieldBinding,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeSubscriptions,
} = NotificationCenterBlock
