import { Schema } from 'effect'
import { Block } from 'foldkit'

import { ApiData } from './domain'
import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'
import type { ViewInputs } from './viewInputs'

export const ApiReferenceKey = Symbol('ApiReference')
export const ApiReferenceBlock = Block.make('ApiReference', {
  key: ApiReferenceKey,
  InitArgs: Schema.Tuple([Schema.optional(Schema.Option(ApiData))]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  Model,
  Message,
  InMessage,
})

export const { makeCommand, makeComposition, makeFieldsStep, makeStep } =
  ApiReferenceBlock
