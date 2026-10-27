import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'

export const NotificationCenterDefinition = Block.makeDefinition(
  'NotificationCenter',
  { Model, Message, OutMessage },
)

export const {
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeBinding,
  makeComposition,
} = NotificationCenterDefinition
