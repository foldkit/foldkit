import { Schema } from 'effect'
import { Block } from 'foldkit'

import { InMessage } from './inMessage'
import { Message } from './message'
import { Model } from './model'
import { OutMessage } from './outMessage'
import { ViewInputs } from './viewInputs'

export const CommandPaletteKey = Symbol('CommandPalette')
export const CommandPaletteBlock = Block.make('CommandPalette', {
  key: CommandPaletteKey,
  Init: Schema.Tuple([]),
  view: { kind: 'Element', Inputs: ViewInputs },
  Model,
  Message,
  InMessage,
  OutMessage,
})

export const {
  makeBinding,
  makeCommand,
  makeComposition,
  makeFieldsStep,
  makeNoopStep,
  makeOutMessageFold,
  makeStep,
  makeSubscriptions,
} = CommandPaletteBlock
