import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import type { ViewInputs } from './viewInputs'
export const ComingFromReactKey = Symbol('ComingFromReact')
export const ComingFromReactBlock = Block.make('ComingFromReact', {
  key: ComingFromReactKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  Model,
  Message,
})

export const { makeComposition } = ComingFromReactBlock
