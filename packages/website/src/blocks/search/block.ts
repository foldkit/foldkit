import { Schema } from 'effect'
import { Block } from 'foldkit'

import { PagefindService } from '../../pagefind'
import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'

export const SearchKey = Symbol('Search')
export const SearchBlock = Block.make('Search', {
  key: SearchKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element' },
  effects: { services: [PagefindService] },
  Model,
  Message,
  InMessage,
})

export const {
  makeRequiredFieldBinding,
  makeCommand,
  makeCommandsStep,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeStep,
} = SearchBlock
