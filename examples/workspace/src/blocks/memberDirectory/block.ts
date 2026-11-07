import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { ViewInputs } from './viewInputs'

export const MemberDirectoryKey = Symbol('MemberDirectory')
export const MemberDirectoryBlock = Block.make('MemberDirectory', {
  key: MemberDirectoryKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: ViewInputs },
  Model,
  Message,
})

export const { makeComposition, makeFieldsStep } = MemberDirectoryBlock
