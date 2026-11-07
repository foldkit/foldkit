import { Schema } from 'effect'
import { Block } from 'foldkit'
import { CalendarDate } from 'foldkit/calendar'

import { Message } from './message'
import { Model } from './model'
import type { ViewInputs } from './viewInputs'

export const UiKey = Symbol('Ui')
export const UiBlock = Block.make('Ui', {
  key: UiKey,
  InitArgs: Schema.Tuple([CalendarDate]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  Model,
  Message,
  ChildInitContext: CalendarDate,
})

export const {
  makeRequiredFieldBinding,
  makeCommand,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeStep,
} = UiBlock
