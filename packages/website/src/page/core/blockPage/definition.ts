import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import type { ViewInputs } from './viewInputs'

export const BlockPageKey = Symbol('BlockPage')

export const BlockPageDefinition = Block.makeDefinition('BlockPage', {
  key: BlockPageKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  Model,
  Message,
})

export const { makeFieldsStep } = BlockPageDefinition
