import { Schema } from 'effect'
import { Block } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'

import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'

const UiKey = Symbol('Ui')
export const UiBlock = Block.make('Ui', {
  key: UiKey,
  Init: Schema.Tuple([CalendarDate]),
  Model,
  Message,
  InMessage,
  ChildInitContext: CalendarDate,
})

export const { makeFieldsStep, makeNoopStep } = UiBlock
