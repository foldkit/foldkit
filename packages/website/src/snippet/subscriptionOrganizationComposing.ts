import { Schema } from 'effect'
import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import * as ThemeMenu from './themeMenu'

export const SettingsKey = Symbol('Settings')
export const SettingsBlock = Block.make('Settings', {
  key: SettingsKey,
  Init: Schema.Tuple([]),
  Model,
  Message,
})

const { makeNoopStep, makeOutMessageFold, makeBinding, makeComposition } =
  SettingsBlock

const foldThemeMenuOutMessage = makeOutMessageFold(ThemeMenu.ThemeMenuBlock, {
  Selected: makeNoopStep,
  Closed: makeNoopStep,
})

const ThemeMenuBinding = makeBinding(ThemeMenu.ThemeMenuBlock, {
  field: 'themeMenu',
}).withOutMessagePolicy({ fold: foldThemeMenuOutMessage })

export const SettingsComposition = makeComposition({
  bindings: [ThemeMenuBinding],
})
