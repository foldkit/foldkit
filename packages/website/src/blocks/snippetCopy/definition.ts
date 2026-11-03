import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import type { ViewInputs } from './viewInputs'

export const SnippetCopyKey = Symbol('SnippetCopy')

export const SnippetCopyDefinition = Block.makeDefinition('SnippetCopy', {
  key: SnippetCopyKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  Model,
  Message,
})

export const { makeCommandsStep, makeFieldsStep, makeNoopStep } =
  SnippetCopyDefinition
