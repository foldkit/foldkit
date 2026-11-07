import { Option } from 'effect'
import { Update } from 'foldkit'
import { initAndSet } from 'foldkit/binding'
import { modifyFields } from 'foldkit/struct'

import { makeStep } from '../block'
import { PlaygroundBinding, UiPagesBinding } from '../composition'
import { findActiveSectionKeyForRoute } from '../docsNav'
import type { Message, ThemePreference } from '../message'
import { initialSidebarGroups } from '../sidebarStorage'
import { ApplyTheme, resolveTheme } from '../theme'

type CompletedLoadBrowserEnvironmentMessage =
  typeof Message.CompletedLoadBrowserEnvironment.Type

type CompletedLoadBrowserEnvironment = CompletedLoadBrowserEnvironmentMessage

export const handleCompletedLoadBrowserEnvironment = makeStep.fromMessage(
  ({
    maybeThemePreference,
    maybeSidebarState,
    systemTheme,
    isPlaygroundSupported,
    currentYear,
    today,
  }: CompletedLoadBrowserEnvironment) => {
    const themePreference: ThemePreference = Option.getOrElse(
      maybeThemePreference,
      () => 'System',
    )
    const resolvedTheme = resolveTheme(themePreference, systemTheme)

    const applyBrowserEnvironment = makeStep(model => ({
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

    const initUiPages = makeStep(model =>
      initAndSet(UiPagesBinding, model, { args: [today] }),
    )

    return Update.combineSteps([
      applyBrowserEnvironment,
      PlaygroundBinding.informOfSupport({ isSupported: isPlaygroundSupported }),
      initUiPages,
    ])
  },
)
