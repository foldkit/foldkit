import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'

export const CommandPaletteDefinition = Block.makeDefinition('CommandPalette', {
  Model,
  Message,
  OutMessage,
})

export const {
  makeStep,
  makeFieldsStep,
  makeNoopStep,
  makeBinding,
  makeOutMessageFold,
  makeComposition,
} = CommandPaletteDefinition
