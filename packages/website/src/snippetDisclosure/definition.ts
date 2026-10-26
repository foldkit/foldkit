import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const SnippetDisclosureDefinition = Block.makeDefinition(
  'SnippetDisclosure',
  {
    Model,
    Message,
  },
)

export const { makeFieldsStep } = SnippetDisclosureDefinition
