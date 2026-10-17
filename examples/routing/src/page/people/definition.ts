import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const People = Block.define('People', { Model, Message })

export const PeopleComposition = People.makeComposition()
