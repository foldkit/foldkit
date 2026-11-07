import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import type { ViewInputs } from './viewInputs'

export const BlockPageKey = Symbol('BlockPage')
export const BlockPageBlock = Block.make('BlockPage', {
  key: BlockPageKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  Model,
  Message,
})

export const { makeComposition, makeFieldsStep } = BlockPageBlock
