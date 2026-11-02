import { Effect } from 'effect'
import {
  Command,
  expectOutMessage,
  given,
  messageFrom,
  model,
  story,
} from 'foldkit/story'
import { expect, test } from 'vitest'

import { SaveTheme } from './blockDefinition'
import {
  Model,
  OutMessage,
  SettingsBinding,
  ApplicationBlock,
} from './blockExtractedConnectedStep'
import { SettingsBlock } from './blockSettings'

test('folds a child fact without rendering its view', () =>
  Effect.runPromise(
    story(
      ApplicationBlock,
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
  ))
