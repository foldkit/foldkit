import {
  Command,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'
import { toParentMessage } from 'foldkit/test'
import { expect, test } from 'vitest'

import { SaveTheme } from './blockDefinition'
import {
  Model,
  OutMessage,
  SettingsBinding,
  update,
} from './blockExtractedConnectedStep'
import { SettingsBlock } from './blockSettings'

test('folds a child fact without rendering its view', () => {
  story(
    update,
    given(
      Model.make({
        settings: SettingsBlock.Model.make({ theme: 'System' }),
        themeChangeCount: 3,
      }),
    ),
    message(
      toParentMessage(
        SettingsBinding,
        SettingsBlock.Message.ChangedTheme({ theme: 'Dark' }),
      ),
    ),
    model(model => {
      expect(model.settings.theme).toBe('Dark')
    }),
    expectOutMessage(
      OutMessage.ChangedTheme({ theme: 'Dark', changeCount: 3 }),
    ),
    Command.resolve(SaveTheme, SettingsBlock.Message.CompletedSaveTheme()),
  )
})
