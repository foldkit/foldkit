import { Option } from 'effect'
import { Scene } from 'foldkit'

import { LoadApiData } from './blocks/apiReference/command'
import { ApiData } from './blocks/apiReference/domain'
import { Message as ApiReferenceMessage } from './blocks/apiReference/message'
import {
  InjectAnalytics,
  InjectSpeedInsights,
  LoadBrowserEnvironment,
  ScrollSidebarActiveLinkIntoView,
} from './command'
import type { Flags } from './flags'
import { Message } from './message'
import { ApplyTheme } from './theme'

export const resolveBrowserStartup = (flags: Flags) =>
  Scene.Command.resolveAll(
    [
      LoadBrowserEnvironment,
      Message.CompletedLoadBrowserEnvironment({
        maybeThemePreference: Option.none(),
        maybeSidebarState: Option.none(),
        systemTheme: 'Light',
        isPlaygroundSupported: true,
        currentYear: flags.currentYear,
        today: flags.today,
      }),
    ],
    [ApplyTheme, Message.CompletedApplyTheme()],
    [InjectAnalytics, Message.CompletedInjectAnalytics()],
    [InjectSpeedInsights, Message.CompletedInjectSpeedInsights()],
    [
      ScrollSidebarActiveLinkIntoView,
      Message.CompletedScrollSidebarActiveLinkIntoView(),
    ],
  )

export const resolveApiData = Scene.Command.resolve(
  LoadApiData,
  ApiReferenceMessage.SucceededLoadApiData({
    apiData: ApiData.make({ parsedApi: { modules: [] }, highlights: {} }),
  }),
)
