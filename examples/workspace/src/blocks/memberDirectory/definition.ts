import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { ViewInputs } from './viewInputs'

export const MemberDirectoryKey = Symbol('MemberDirectory')

export const MemberDirectoryDefinition = Block.makeDefinition(
  'MemberDirectory',
  {
    key: MemberDirectoryKey,
    Init: Schema.Tuple([]),
    view: { kind: 'Element', Inputs: ViewInputs },
    Model,
    Message,
  },
)

export const MemberDirectoryBlock = MemberDirectoryDefinition.contract

export const { makeComposition, makeFieldsStep } = MemberDirectoryDefinition
