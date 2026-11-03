import { Schema } from 'effect'
import { Block } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'

import { Message } from './message'
import { Model } from './model'
import type { ViewInputs } from './viewInputs'

export const UiKey = Symbol('Ui')

export const UiDefinition = Block.makeDefinition('Ui', {
  key: UiKey,
  Init: Schema.Tuple([CalendarDate]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  Model,
  Message,
  ChildInitContext: CalendarDate,
})

export const { makeFieldsStep, makeNoopStep, makeStep } = UiDefinition
