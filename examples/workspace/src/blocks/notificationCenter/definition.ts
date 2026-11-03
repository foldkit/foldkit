import { Schema } from 'effect'
import { Block } from 'foldkit'

import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'
import { ViewInputs } from './viewInputs'

export const NotificationCenterKey = Symbol('NotificationCenter')

export const NotificationCenterDefinition = Block.makeDefinition(
  'NotificationCenter',
  {
    key: NotificationCenterKey,
    Init: Schema.Tuple([]),
    view: { kind: 'Element', Inputs: ViewInputs },
    Model,
    Message,
    InMessage,
    OutMessage,
  },
)

export const NotificationCenterBlock = NotificationCenterDefinition.contract

export const {
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeBinding,
  makeComposition,
} = NotificationCenterDefinition
