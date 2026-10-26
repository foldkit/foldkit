import { Effect, Option, Schema, Stream } from 'effect'
import { Dom } from 'foldkit'

import { DARK_COLOR_SCHEME_QUERY } from '../colorScheme'
import { ApplicationDefinition } from '../definition'
import { Message } from '../message'
import { isSearchRoute } from '../route'
import { NARROW_VIEWPORT_QUERY } from '../viewport'
import {
  activeSectionChanges,
  activeSectionDependencies,
} from './activeSection'

export const subscriptions = ApplicationDefinition.makeSubscriptions(entry => ({
  activeSectionChanges: entry(
    'ActiveSectionChanges',
    {
      pageId: Schema.String,
      sections: Schema.Array(Schema.String),
    },
    {
      messages: [Message.ChangedActiveSection],
      modelToDependencies: activeSectionDependencies,
      handler: function* () {
        return ({ sections }) => activeSectionChanges(sections)
      },
    },
  ),

  searchShortcutPresses: entry(
    'SearchShortcutPresses',
    { isSearchAvailable: Schema.Boolean },
    {
      messages: [Message.PressedSearchShortcut],
      modelToDependencies: model => ({
        isSearchAvailable: isSearchRoute(model.route),
      }),
      handler: function* () {
        return ({ isSearchAvailable }) =>
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
          )
      },
    },
  ),

  systemThemeChanges: entry(
    'SystemThemeChanges',
    { isSystemPreference: Schema.Boolean },
    {
      messages: [Message.ChangedSystemTheme],
      modelToDependencies: model => ({
        isSystemPreference: Option.exists(
          model.maybeThemePreference,
          preference => preference === 'System',
        ),
      }),
      handler: function* () {
        return ({ isSystemPreference }) =>
          Stream.when(
            Dom.streamFromMediaQuery({
              query: DARK_COLOR_SCHEME_QUERY,
              mapMatches: isDark =>
                Message.ChangedSystemTheme({
                  theme: isDark ? 'Dark' : 'Light',
                }),
            }),
            Effect.sync(() => isSystemPreference),
          )
      },
    },
  ),

  viewportWidthChanges: entry('ViewportWidthChanges', {
    messages: [Message.ChangedViewportWidth],
    handler: function* () {
      return () =>
        Dom.streamFromMediaQuery({
          query: NARROW_VIEWPORT_QUERY,
          mapMatches: isNarrow => Message.ChangedViewportWidth({ isNarrow }),
        })
    },
  }),
}))
