import { Schema } from 'effect'
import { Block } from 'foldkit'

import { ExampleSources } from './domain'
import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'
import type { ViewInputs } from './viewInputs'

export const ExampleDetailKey = Symbol('ExampleDetail')

export const ExampleDetailDefinition = Block.makeDefinition('ExampleDetail', {
  key: ExampleDetailKey,
  Init: Schema.Tuple([
    Schema.optional(Schema.Option(Schema.String)),
    Schema.optional(Schema.Option(ExampleSources)),
  ]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  Model,
  Message,
  InMessage,
})

export const { makeFieldsStep, makeStep } = ExampleDetailDefinition
