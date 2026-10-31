import { Effect, Option, Stream } from 'effect'
import { Dom } from 'foldkit'

import { DARK_COLOR_SCHEME_QUERY } from '../colorScheme'
import { Message } from '../message'
import type { Model } from '../model'
import { isSearchRoute } from '../route'
import { NARROW_VIEWPORT_QUERY } from '../viewport'
import {
  type ActiveSectionDependencies,
  activeSectionChanges,
  activeSectionDependencies,
} from './activeSection'

export const viewportWidthChanges = Dom.streamFromMediaQuery({
  query: NARROW_VIEWPORT_QUERY,
  mapMatches: isNarrow => Message.ChangedViewportWidth({ isNarrow }),
})

export const subscriptions = {
  activeSectionChanges: {
    dependencies: activeSectionDependencies,
    stream: ({ sections }: ActiveSectionDependencies) =>
      activeSectionChanges(sections),
  },

  searchShortcutPresses: {
    dependencies: (model: Model) => isSearchRoute(model.route),
    stream: (isSearchAvailable: boolean) =>
      Stream.when(
        Dom.streamFromEventFilterMapPreventDefault({
          target: document,
          type: 'keydown',
          filterMapEvent: event => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
              return Option.some(Message.PressedSearchShortcut())
            }
            return Option.none()
          },
        }),
        Effect.sync(() => isSearchAvailable),
      ),
  },

  systemThemeChanges: {
    dependencies: (model: Model) =>
      Option.exists(
        model.maybeThemePreference,
        preference => preference === 'System',
      ),
    stream: (isSystemPreference: boolean) =>
      Stream.when(
        Dom.streamFromMediaQuery({
          query: DARK_COLOR_SCHEME_QUERY,
          mapMatches: isDark =>
            Message.ChangedSystemTheme({
              theme: isDark ? 'Dark' : 'Light',
            }),
        }),
        Effect.sync(() => isSystemPreference),
      ),
  },
}
