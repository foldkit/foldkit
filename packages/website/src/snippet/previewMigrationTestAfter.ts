import { Effect, Layer } from 'effect'
import { Block } from 'foldkit'
import { Command, message, model, story } from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { ApplicationLive } from './previewMigrationChildAfter'
import {
  SaveTheme,
  Settings,
  SettingsLive,
  SettingsStore,
} from './previewMigrationCommandAfter'

const SettingsStoreTest = Layer.succeed(SettingsStore, {
  saveTheme: () => Effect.void,
})

it.effect('choosing a theme saves it', () =>
  story(
    SettingsLive.pipe(Layer.provide(SettingsStoreTest)),
    message(Settings.Message.ClickedTheme({ theme: 'Dark' })),
    Command.resolve(SaveTheme, Settings.Message.CompletedSaveTheme()),
    model(model => {
      expect(model.theme).toBe('Dark')
    }),
  ),
)

it.effect('the parent previews the theme the child reports', () =>
  story(
    ApplicationLive.pipe(Layer.provide(SettingsStoreTest)),
    message(
      Block.deliver(
        Settings,
        'settings',
        Settings.Message.ClickedTheme({ theme: 'Dark' }),
      ),
    ),
    Command.resolve(SaveTheme, Settings.Message.CompletedSaveTheme()),
    model(model => {
      expect(model.previewTheme).toBe('Dark')
      expect(model.settings.theme).toBe('Dark')
    }),
  ),
)
