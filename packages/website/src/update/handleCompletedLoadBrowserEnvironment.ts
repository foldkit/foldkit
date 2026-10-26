import { Option } from 'effect'
import { Update } from 'foldkit'
import { initAndSet } from 'foldkit/bindingInit'
import { modifyFields } from 'foldkit/struct'

import { PlaygroundBinding, UiPagesBinding } from '../composition'
import { makeStep } from '../definition'
import { findActiveSectionKeyForRoute } from '../docsNav'
import type { Message, ThemePreference } from '../message'
import { initialSidebarGroups } from '../sidebarStorage'
import { ApplyTheme, resolveTheme } from '../theme'

export const handleCompletedLoadBrowserEnvironmentStep = makeStep(
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

    const applyBrowserEnvironmentStep = makeStep(model => ({
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

    const initUiPagesStep = makeStep(model =>
      initAndSet(UiPagesBinding, model, { args: [today] }),
    )

    return Update.combineSteps([
      applyBrowserEnvironmentStep,
      PlaygroundBinding.informSupport({ isSupported: isPlaygroundSupported }),
      initUiPagesStep,
    ])
  },
)
