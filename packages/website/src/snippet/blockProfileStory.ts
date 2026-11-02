import { Effect, Layer } from 'effect'
import { Block } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { ProfileLive } from './blockProfileParent'
import { SaveTheme, Settings, SettingsStore } from './blockSettingsContract'
import { SettingsLive } from './blockSettingsLive'

const SettingsStoreTest = Layer.succeed(SettingsStore, {
  saveTheme: () => Effect.void,
})

it.effect('a theme chosen in Settings updates the profile preview', () =>
  story(
    ProfileLive.pipe(Layer.provide(SettingsLive)),
    message(
      Block.deliver(
        Settings,
        'settings',
        Settings.Message.ClickedTheme({ theme: 'Dark' }),
      ),
    ),
    Command.expectExact(Command.at('settings', SaveTheme)),
    Command.resolve(
      Command.at('settings', SaveTheme),
      Settings.Message.SucceededSaveTheme(),
    ),
    model(model => {
      expect(model.previewTheme).toBe('Dark')
      expect(model.settings.theme).toBe('Dark')
    }),
  ).pipe(Effect.provide(SettingsStoreTest)),
)
