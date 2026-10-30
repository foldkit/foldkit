import { Option } from 'effect'
import type { CalendarDate } from 'foldkit/calendar'
import { modifyFields } from 'foldkit/struct'

import { findActiveSectionKeyForRoute } from '../docsNav'
import type { Message, ThemePreference } from '../message'
import type { Model } from '../model'
import { Playground, type Ui } from '../page'
import { initialSidebarGroups } from '../sidebarStorage'
import { ApplyTheme, resolveTheme } from '../theme'

type CompletedLoadBrowserEnvironment =
  typeof Message.CompletedLoadBrowserEnvironment.Type

export const handleCompletedLoadBrowserEnvironment =
  (uiPagesFor: (today: CalendarDate) => Ui) =>
  (
    model: Model,
    {
      maybeThemePreference,
      maybeSidebarState,
      systemTheme,
      isPlaygroundSupported,
      currentYear,
      today,
    }: CompletedLoadBrowserEnvironment,
  ) => {
    const themePreference: ThemePreference = Option.getOrElse(
      maybeThemePreference,
      () => 'System',
    )
    const resolvedTheme = resolveTheme(themePreference, systemTheme)

    return {
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
        uiPages: () => uiPagesFor(today),
      }),
      commands: [ApplyTheme({ theme: resolvedTheme })],
      messages: Option.toArray(
        Option.map(model.playground, playground =>
          playground.send(
            Playground.Message.InformedOfSupport({
              isSupported: isPlaygroundSupported,
            }),
          ),
        ),
      ),
    }
  }
