import { Schema } from 'effect'
import { Url } from 'foldkit/url'

import { Dialog } from '@foldkit/ui'

import { Deployment } from './deployment'
import { ResolvedTheme } from './message'
import {
  ApiReference,
  ComingFromReact,
  CoreBlockPage,
  ExampleDetail,
  Home,
  Playground,
  Ui,
} from './page'
import { ApplicationRoute } from './route'
import * as Search from './search'
import { SidebarGroups } from './sidebarStorage'
import * as SnippetCopy from './snippetCopy'
import * as SnippetDisclosure from './snippetDisclosure'
import { ThemePreference } from './themePreference'
import { ThemeMenu } from './view/themeMenu'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  url: Url,
  deployment: Deployment,
  snippetCopy: SnippetCopy.Model,
  snippetDisclosure: SnippetDisclosure.Model,
  maybeGitHubStarCount: Schema.Option(Schema.Number),
  currentYear: Schema.Number,
  mobileMenuDialog: Dialog.Model,
  isMobileTableOfContentsOpen: Schema.Boolean,
  activeSection: Schema.Option(Schema.String),
  isNarrowViewport: Schema.Boolean,
  maybeIsPlaygroundSupported: Schema.Option(Schema.Boolean),
  playground: Schema.Option(Playground.Model),
  sidebarGroups: SidebarGroups,
  coreBlockPage: CoreBlockPage.Model,
  maybeHome: Schema.Option(Home.Model),
  themeMenu: ThemeMenu.Model,
  maybeThemePreference: Schema.Option(ThemePreference),
  systemTheme: ResolvedTheme,
  resolvedTheme: ResolvedTheme,
  uiPages: Ui.Model,
  comingFromReact: ComingFromReact.Model,
  apiReference: ApiReference.Model,
  exampleDetail: ExampleDetail.Model,
  search: Search.Model,
})
export type Model = typeof Model.Type
