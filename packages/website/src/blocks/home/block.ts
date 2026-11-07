import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message, OutMessage } from './message'
import { Model } from './model'
import type { ViewInputs } from './viewInputs'

export const HomeKey = Symbol('Home')
export const HomeBlock = Block.make('Home', {
  key: HomeKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  Model,
  Message,
  OutMessage,
})

export const {
  makeRequiredFieldBinding,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeOutMessageStep,
} = HomeBlock
