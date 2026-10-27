import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const MemberDirectoryDefinition = Block.makeDefinition(
  'MemberDirectory',
  {
    Model,
    Message,
  },
)

export const { makeComposition, makeFieldsStep } = MemberDirectoryDefinition
