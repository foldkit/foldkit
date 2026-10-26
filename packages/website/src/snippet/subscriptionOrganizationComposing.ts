import { Block } from 'foldkit'

import { Message } from './message'
import { Model } from './model'
import * as ThemeMenu from './themeMenu'

export const SettingsDefinition = Block.makeDefinition('Settings', {
  Model,
  Message,
})

const { makeNoopStep } = SettingsDefinition

const foldThemeMenuOutMessage = SettingsDefinition.makeOutMessageFold(
  ThemeMenu.ThemeMenuBlock,
  {
    Selected: makeNoopStep,
    Closed: makeNoopStep,
  },
)

const ThemeMenuBinding = SettingsDefinition.makeBinding(
  ThemeMenu.ThemeMenuBlock,
  {
    field: 'themeMenu',
  },
).withOutMessagePolicy({ fold: foldThemeMenuOutMessage })

export const SettingsComposition = SettingsDefinition.makeComposition({
  bindings: [ThemeMenuBinding],
})
