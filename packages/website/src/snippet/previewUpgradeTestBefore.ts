// Before: a Story ran the composed update and wrapped child facts.
import { Command, given, message, model, story } from 'foldkit/story'
import { toParentMessage } from 'foldkit/test'
import { expect, test } from 'vitest'

import { SettingsBinding, init, update } from './application'
import { SaveTheme, SettingsBlock } from './settings'

test('the parent previews the theme the child reports', () => {
  story(
    update,
    given(init().model),
    message(
      toParentMessage(
        SettingsBinding,
        SettingsBlock.Message.ClickedTheme({ theme: 'Dark' }),
      ),
    ),
    Command.resolve(SaveTheme, SettingsBlock.Message.CompletedSaveTheme()),
    model(model => {
      expect(model.previewTheme).toBe('Dark')
    }),
  )
})
