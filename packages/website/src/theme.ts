import { Effect, Match, Option } from 'effect'
import { modifyFields } from 'foldkit/struct'

import { Application } from './definition'
import { Message, ResolvedTheme } from './message'
import { LocalStorage } from './storage'
import { ThemePreference } from './themePreference'

export const THEME_STORAGE_KEY = 'theme-preference'

export const resolveTheme = (
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme =>
  Match.value(preference).pipe(
    Match.withReturnType<ResolvedTheme>(),
    Match.when('Dark', () => 'Dark'),
    Match.when('Light', () => 'Light'),
    Match.when('System', () => systemTheme),
    Match.exhaustive,
  )

export const selectThemePreference = (preference: ThemePreference) =>
  Application.step(model => {
    const resolvedTheme = resolveTheme(preference, model.systemTheme)

    return {
      model: modifyFields(model, {
        maybeThemePreference: () => Option.some(preference),
        resolvedTheme: () => resolvedTheme,
      }),
      commands: [
        ApplyTheme({ theme: resolvedTheme }),
        SaveThemePreference({ preference }),
      ],
    }
  })

// NOTE: mirrors --color-cream and --color-gray-900 in styles.css.
// src/themeColor.test.ts fails when these drift.
const LIGHT_THEME_COLOR = '#f8f7fb'
const DARK_THEME_COLOR = '#17151b'

const setThemeColorMeta = (color: string): void => {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]')
  if (themeColorMeta !== null) {
    themeColorMeta.setAttribute('content', color)
  }
}

export const ApplyTheme = Application.command('ApplyTheme', {
  args: { theme: ResolvedTheme },
  messages: [Message.CompletedApplyTheme],
  handler: function* () {
    return ({ theme }) =>
      Effect.sync(() => {
        Match.value(theme).pipe(
          Match.when('Dark', () => {
            document.documentElement.classList.add('dark')
            setThemeColorMeta(DARK_THEME_COLOR)
          }),
          Match.when('Light', () => {
            document.documentElement.classList.remove('dark')
            setThemeColorMeta(LIGHT_THEME_COLOR)
          }),
          Match.exhaustive,
        )
        return Message.CompletedApplyTheme()
      })
  },
})

export const SaveThemePreference = Application.command('SaveThemePreference', {
  args: { preference: ThemePreference },
  messages: [Message.CompletedSaveThemePreference],
  handler: function* () {
    const store = yield* LocalStorage

    return ({ preference }) =>
      store.set(THEME_STORAGE_KEY, JSON.stringify(preference)).pipe(
        Effect.as(Message.CompletedSaveThemePreference()),
        Effect.catch(() =>
          Effect.succeed(Message.CompletedSaveThemePreference()),
        ),
      )
  },
})
