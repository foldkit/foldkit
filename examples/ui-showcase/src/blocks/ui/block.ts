import { Schema } from 'effect'
import { Block } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'

import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'

export const UiKey = Symbol('Ui')
export const UiBlock = Block.make('Ui', {
  key: UiKey,
  InitArgs: Schema.Tuple([CalendarDate]),
  Model,
  Message,
  InMessage,
  ChildInitContext: CalendarDate,
})

export const {
  makeRequiredFieldBinding,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
} = UiBlock
