import { Schema } from 'effect'
import { Block } from 'foldkit'

import { InMessage, Message } from './informingBlocksMessage'
import { Model } from './informingBlocksModel'
import { ApplicationRoute } from './informingBlocksRoute'
import { PeopleDirectory } from './informingBlocksService'

export const PeopleKey = Symbol('People')
export const PeopleBlock = Block.make('People', {
  key: PeopleKey,
  InitArgs: Schema.Tuple([ApplicationRoute.People]),
  InMessage,
  effects: { services: [PeopleDirectory] },

  Model,
  Message,
})

export const { makeCommand, makeComposition } = PeopleBlock
export const PeopleComposition = makeComposition()
