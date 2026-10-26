import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const SnippetCopyDefinition = Block.makeDefinition('SnippetCopy', {
  Model,
  Message,
})

export const { makeCommandsStep, makeFieldsStep, makeNoopStep } =
  SnippetCopyDefinition
