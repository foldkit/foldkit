import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import type { ViewInputs } from './viewInputs'

export const SnippetDisclosureKey = Symbol('SnippetDisclosure')
export const SnippetDisclosureBlock = Block.make('SnippetDisclosure', {
  key: SnippetDisclosureKey,
  InitArgs: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: Block.makeInputContract<ViewInputs>() },
  Model,
  Message,
})

export const { makeComposition, makeFieldsStep, makeMount } =
  SnippetDisclosureBlock
