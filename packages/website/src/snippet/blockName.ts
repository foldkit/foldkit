import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

export const SettingsKey = Symbol('Settings')
export const SettingsBlock = Block.make('Settings', {
  key: SettingsKey,
  InitArgs: Schema.Tuple([]),
  Model,
  Message,
})
