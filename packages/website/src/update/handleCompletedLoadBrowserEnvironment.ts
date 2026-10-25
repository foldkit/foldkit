import { Option } from 'effect'
import { Update } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { PlaygroundBinding, UiPagesBinding } from '../composition'
import { ApplicationDefinition } from '../definition'
import { findActiveSectionKeyForRoute } from '../docsNav'
import type { Message, ThemePreference } from '../message'
import { initialSidebarGroups } from '../sidebarStorage'
import { ApplyTheme, resolveTheme } from '../theme'

export const handleCompletedLoadBrowserEnvironment =
  ApplicationDefinition.makeStep(
    (
      _model,
      {
        maybeThemePreference,
        maybeSidebarState,
        systemTheme,
        isPlaygroundSupported,
        currentYear,
        today,
      }: typeof Message.CompletedLoadBrowserEnvironment.Type,
    ) => {
      const themePreference: typeof ThemePreference.Type = Option.getOrElse(
        maybeThemePreference,
        () => 'System',
      )
      const resolvedTheme = resolveTheme(themePreference, systemTheme)

      const applyBrowserEnvironment = ApplicationDefinition.makeStep(model => ({
        model: modifyFields(model, {
          currentYear: () => currentYear,
          maybeIsPlaygroundSupported: () => Option.some(isPlaygroundSupported),
          sidebarGroups: () =>
            initialSidebarGroups(
              maybeSidebarState,
              findActiveSectionKeyForRoute(model.route),
            ),
          maybeThemePreference: () => Option.some(themePreference),
          systemTheme: () => systemTheme,
          resolvedTheme: () => resolvedTheme,
        }),
        commands: [ApplyTheme({ theme: resolvedTheme })],
      }))

      const initUiPages = ApplicationDefinition.makeStep(model => {
        return UiPagesBinding.init({
          args: [today],
          toParentModel: uiPages =>
            modifyFields(model, { uiPages: () => uiPages }),
        })
      })

      return Update.combineSteps([
        applyBrowserEnvironment,
        PlaygroundBinding.informSupport({ isSupported: isPlaygroundSupported }),
        initUiPages,
      ])
    },
  )
