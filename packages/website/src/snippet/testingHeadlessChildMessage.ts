import {
  Command,
  expectOutMessage,
  given,
  messageFrom,
  model,
  story,
} from 'foldkit/story'
import { expect } from 'vitest'

import { it } from '@effect/vitest'

import { SaveTheme } from './blockDefinition'
import {
  ApplicationBlock,
  Model,
  OutMessage,
  SettingsBinding,
  layer,
} from './blockExtractedConnectedStep'
import { SettingsBlock } from './blockSettings'

it.effect('folds a child fact without rendering its view', () =>
  story(
    { block: ApplicationBlock, layer },
    given(
      Model.make({
        settings: SettingsBlock.Model.make({ theme: 'System' }),
        themeChangeCount: 3,
      }),
    ),
    messageFrom(
      SettingsBinding,
      SettingsBlock.Message.ChangedTheme({ theme: 'Dark' }),
    ),
    model(model => {
      expect(model.settings.theme).toBe('Dark')
    }),
    expectOutMessage(
      OutMessage.ChangedTheme({ theme: 'Dark', changeCount: 3 }),
    ),
    Command.resolve(SaveTheme, SettingsBlock.Message.CompletedSaveTheme()),
  ),
)
