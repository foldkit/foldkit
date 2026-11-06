import { Story } from 'foldkit'
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
  Story.story(
    { block: ApplicationBlock, layer },
    Story.given(
      Model.make({
        settings: SettingsBlock.Model.make({ theme: 'System' }),
        themeChangeCount: 3,
      }),
    ),
    Story.messageIn(
      SettingsBinding,
      SettingsBlock.Message.ChangedTheme({ theme: 'Dark' }),
    ),
    Story.model(model => {
      expect(model.settings.theme).toBe('Dark')
    }),
    Story.expectOutMessage(
      OutMessage.ChangedTheme({ theme: 'Dark', changeCount: 3 }),
    ),
    Story.Command.resolve(
      SaveTheme,
      SettingsBlock.Message.CompletedSaveTheme(),
    ),
  ),
)
