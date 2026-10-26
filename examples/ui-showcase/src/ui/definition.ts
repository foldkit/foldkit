import { Block } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'

import { Message } from './message'
import { Model } from './model'

export const UiDefinition = Block.makeDefinition('Ui', {
  Model,
  Message,
  ChildInitContext: CalendarDate,
})

export const { makeFieldsStep, makeNoopStep } = UiDefinition
