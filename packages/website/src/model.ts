import { Schema } from 'effect'
import { Url } from 'foldkit/url'

import { Dialog, Menu } from '@foldkit/ui'

import { Deployment } from './deployment'
import { ResolvedTheme, ThemePreference } from './message'
import {
  ApiReference,
  ComingFromReact,
  Core,
  Example,
  Home,
  Playground,
  Ui,
} from './page'
import { AppRoute } from './route'
import * as Search from './search'
import { SidebarGroups } from './sidebarStorage'
import * as SnippetCopy from './snippetCopy'

export const Model = Schema.Struct({
  route: AppRoute,
  url: Url,
  deployment: Deployment,
  snippetCopy: SnippetCopy.Model,
  maybeGitHubStarCount: Schema.Option(Schema.Number),
  currentYear: Schema.Number,
  mobileMenuDialog: Dialog.Model,
  isMobileTableOfContentsOpen: Schema.Boolean,
  activeSection: Schema.Option(Schema.String),
  isNarrowViewport: Schema.Boolean,
  maybeIsChromium: Schema.Option(Schema.Boolean),
  playground: Schema.Option(Playground.Model),
  sidebarGroups: SidebarGroups,
  coreSubmodelPage: Core.SubmodelPage.Model,
  maybeHome: Schema.Option(Home.Model),
  themeMenu: Menu.Model,
  maybeThemePreference: Schema.Option(ThemePreference),
  systemTheme: ResolvedTheme,
  resolvedTheme: ResolvedTheme,
  uiPages: Ui.Model,
  comingFromReact: ComingFromReact.Model,
  apiReference: ApiReference.Model,
  exampleDetail: Example.ExampleDetail.Model,
  search: Search.Model,
})
export type Model = typeof Model.Type
