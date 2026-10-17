import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const SnippetCopy = Block.define('SnippetCopy', {
  Model,
  Message,
})

export const SnippetCopyComposition = SnippetCopy.makeComposition()
