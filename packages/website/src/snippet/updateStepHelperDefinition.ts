import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

const SearchKey = Symbol('Search')

export const SearchDefinition = Block.makeDefinition('Search', {
  key: SearchKey,
  Init: Schema.Tuple([]),
  Model,
  Message,
})

export const { makeFieldsStep, makeNoopStep } = SearchDefinition
