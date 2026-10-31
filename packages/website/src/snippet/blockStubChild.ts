import { Effect, Layer, Option } from 'effect'
import { Block } from 'foldkit'
import { message, model, story } from 'foldkit/story'

import { expect, it } from '@effect/vitest'

import { ProfileLive } from './blockProfileParent'
import { Settings } from './blockSettingsContract'

const SettingsStub = Settings.make(
  Effect.fn(function* (_id, { initialTheme }) {
    return {
      model: { theme: initialTheme, maybeSaveError: Option.none() },
      update: {
        ClickedTheme: (model, { theme }) => ({
          model,
          outMessage: Settings.OutMessage.ChangedTheme({ theme }),
        }),
        RequestedReset: model => ({ model }),
        SucceededSaveTheme: model => ({ model }),
        FailedSaveTheme: model => ({ model }),
      },
      commands: { SaveTheme: () => Effect.never },
    }
  }),
)

it.effect('the profile previews whatever theme Settings reports', () =>
  story(
    ProfileLive.pipe(Layer.provide(SettingsStub)),
    message(
      Block.deliver(
        Settings,
        'settings',
        Settings.Message.ClickedTheme({ theme: 'Light' }),
      ),
    ),
    model(model => expect(model.previewTheme).toBe('Light')),
  ),
)
