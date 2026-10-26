import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const RoomDefinition = Block.makeDefinition('Room', { Model, Message })

export const { makeCommandsStep, makeFieldsStep, makeNoopStep } = RoomDefinition
