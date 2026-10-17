import { Array, Option } from 'effect'
import { type Url } from 'foldkit/url'
import { githubStarCount } from 'virtual:landing-data'

import * as Command from './command'
import {
  ApiReferenceBinding,
  ApplicationComposition,
  ExampleDetailBinding,
} from './composition'
import { Application } from './definition'
import { type Deployment, isTelemetryEnabled } from './deployment'
import { findActiveSectionKeyForRoute } from './docsNav'
import { type Flags } from './flags'
import { type ResolvedTheme, type ThemePreference } from './message'
import { maybeExampleSlugForRoute, urlToApplicationRoute } from './route'
import { initialSidebarGroups } from './sidebarStorage'

const browserStartupCommands = (deployment: Deployment) => [
  Command.LoadBrowserEnvironment(),
  ...Array.filter(
    [Command.InjectAnalytics(), Command.InjectSpeedInsights()],
    () => isTelemetryEnabled(deployment),
  ),
]

const scrollToInitialLocation = (url: Url) =>
  Application.step(model => ({
    model,
    commands: [
      Command.ScrollSidebarActiveLinkIntoView(),
      ...Option.match(url.hash, {
        onNone: () => [],
        onSome: hash => [Command.ScrollToAnchor({ hash })],
      }),
    ],
  }))

export const init = ApplicationComposition.makeInit(
  (flags: Flags, url: Url) => {
    const route = urlToApplicationRoute(url)
    const maybeThemePreference = Option.none<ThemePreference>()
    const systemTheme: ResolvedTheme = 'Light'

    return {
      startup: { route, today: flags.today },
      model: {
        route,
        url,
        deployment: flags.deployment,
        maybeGitHubStarCount: Option.fromNullishOr(githubStarCount),
        currentYear: flags.currentYear,
        isMobileTableOfContentsOpen: false,
        activeSection: Option.none(),
        isNarrowViewport: false,
        maybeIsPlaygroundSupported: Option.none(),
        sidebarGroups: initialSidebarGroups(
          Option.none(),
          findActiveSectionKeyForRoute(route),
        ),
        maybeThemePreference,
        systemTheme,
        resolvedTheme: systemTheme,
      },
      commands: browserStartupCommands(flags.deployment),
      steps: [
        ApiReferenceBinding.loadInitialData(flags.maybeApiData),
        ExampleDetailBinding.loadInitialSources(
          maybeExampleSlugForRoute(route),
          flags.maybeExampleSources,
        ),
        scrollToInitialLocation(url),
      ],
    }
  },
)
