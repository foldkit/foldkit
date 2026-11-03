import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import type { ViewInputs } from './viewInputs'

export const SnippetDisclosureKey = Symbol('SnippetDisclosure')

export const SnippetDisclosureDefinition = Block.makeDefinition(
  'SnippetDisclosure',
  {
    key: SnippetDisclosureKey,
    Init: Schema.Tuple([]),
    view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
    Model,
    Message,
  },
)

export const { makeFieldsStep } = SnippetDisclosureDefinition
