import { Effect, Layer, Option } from 'effect'
import {
  Command,
  expectOutMessage,
  given,
  message,
  model,
  story,
} from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { SaveTheme, Settings, SettingsStore } from './blockSettingsContract'
import { SettingsLive } from './blockSettingsLive'

const SettingsStoreTest = Layer.succeed(SettingsStore, {
  saveTheme: () => Effect.void,
})

it.effect('choosing a theme saves it and reports the change', () =>
  story(
    SettingsLive,
    { initialTheme: 'System' },
    given({ theme: 'Light', maybeSaveError: Option.none() }),
    message(Settings.Message.ClickedTheme({ theme: 'Dark' })),
    expectOutMessage(Settings.OutMessage.ChangedTheme({ theme: 'Dark' })),
    Command.expectExact(SaveTheme({ theme: 'Dark' })),
    Command.resolve(
      SaveTheme,
      Settings.Message.FailedSaveTheme({ reason: 'Offline' }),
    ),
    model(model => {
      expect(model.theme).toBe('Dark')
      expect(model.maybeSaveError).toEqual(Option.some('Offline'))
    }),
  ).pipe(Effect.provide(SettingsStoreTest)),
)
