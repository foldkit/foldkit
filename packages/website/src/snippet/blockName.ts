import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'

const SettingsKey = Symbol('Settings')

export const SettingsDefinition = Block.makeDefinition('Settings', {
  key: SettingsKey,
  Init: Schema.Tuple([]),
  Model,
  Message,
})
