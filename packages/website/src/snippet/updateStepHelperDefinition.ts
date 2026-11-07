import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const SearchKey = Symbol('Search')
export const SearchBlock = Block.make('Search', {
  key: SearchKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})

export const { makeFieldsStep, makeNoopStep } = SearchBlock
