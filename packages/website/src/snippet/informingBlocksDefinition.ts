import { Schema } from 'effect'
import { Block } from 'foldkit'

import { InMessage, Message } from './informingBlocksMessage'
import { Model } from './informingBlocksModel'
import { ApplicationRoute } from './informingBlocksRoute'
import { PeopleDirectory } from './informingBlocksService'

const PeopleKey = Symbol('People')

export const PeopleDefinition = Block.makeDefinition('People', {
  key: PeopleKey,
  Init: Schema.Tuple([ApplicationRoute.People]),
  InMessage,
  effects: { services: [PeopleDirectory] },

  Model,
  Message,
})
export const PeopleComposition = PeopleDefinition.makeComposition()
