// Stable before: a Story drives the update function directly.
import { Command, given, message, model, story } from 'foldkit/story'
import { expect, test } from 'vitest'

import { Message, SaveTheme, update } from './settings'

test('choosing a theme saves it', () => {
  story(
    update,
    given({ theme: 'System' }),
    message(Message.ClickedTheme({ theme: 'Dark' })),
    Command.resolve(SaveTheme, Message.CompletedSaveTheme()),
    model(model => {
      expect(model.theme).toBe('Dark')
    }),
  )
})
