import { Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { PlaygroundBinding, UiPagesBinding } from '../composition'
import { Application } from '../definition'
import { findActiveSectionKeyForRoute } from '../docsNav'
import {
  type Message,
  type ResolvedTheme,
  type ThemePreference,
} from '../message'
import { initialSidebarGroups } from '../sidebarStorage'
import { ApplyTheme, resolveTheme } from '../theme'

type BrowserEnvironment = typeof Message.CompletedLoadBrowserEnvironment.Type

export const handleCompletedLoadBrowserEnvironment = Application.step(
  (
    _,
    {
      maybeThemePreference,
      maybeSidebarState,
      systemTheme,
      isPlaygroundSupported,
      currentYear,
      today,
    }: BrowserEnvironment,
  ) => {
    const themePreference: ThemePreference = Option.getOrElse(
      maybeThemePreference,
      () => 'System',
    )
    const resolvedTheme: ResolvedTheme = resolveTheme(
      themePreference,
      systemTheme,
    )

    const applyBrowserEnvironment = Application.step(stepModel => ({
      model: modifyFields(stepModel, {
        currentYear: () => currentYear,
        maybeIsPlaygroundSupported: () => Option.some(isPlaygroundSupported),
        sidebarGroups: () =>
          initialSidebarGroups(
            maybeSidebarState,
            findActiveSectionKeyForRoute(stepModel.route),
          ),
        maybeThemePreference: () => Option.some(themePreference),
        systemTheme: () => systemTheme,
        resolvedTheme: () => resolvedTheme,
      }),
      commands: [ApplyTheme({ theme: resolvedTheme })],
    }))

    const initUiPages = Application.step(stepModel => {
      return UiPagesBinding.init({
        args: [today],
        toParentModel: uiPages =>
          modifyFields(stepModel, { uiPages: () => uiPages }),
      })
    })

    return Update.combine([
      applyBrowserEnvironment,
      PlaygroundBinding.informSupport(isPlaygroundSupported),
      initUiPages,
    ])
  },
)
