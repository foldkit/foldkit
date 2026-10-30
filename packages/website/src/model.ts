import { Schema } from 'effect'
import { Url } from 'foldkit/url'

import { Dialog } from '@foldkit/ui'

import { Deployment } from './deployment'
import { ResolvedTheme } from './message'
import {
  ApiReference,
  BlockPage,
  ComingFromReact,
  ExampleDetail,
  Home,
  Playground,
  Ui,
} from './page'
import { ApplicationRoute } from './route'
import { Search } from './search'
import { SidebarGroups } from './sidebarStorage'
import { SnippetCopy } from './snippetCopy'
import { SnippetDisclosure } from './snippetDisclosure'
import { ThemePreference } from './themePreference'
import { ThemeMenu } from './view/themeMenu'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  url: Url,
  deployment: Deployment,
  snippetCopy: SnippetCopy,
  snippetDisclosure: SnippetDisclosure,
  maybeGitHubStarCount: Schema.Option(Schema.Number),
  currentYear: Schema.Number,
  newsletterEmail: Schema.String,
  mobileMenuDialog: Dialog.Dialog,
  isMobileTableOfContentsOpen: Schema.Boolean,
  activeSection: Schema.Option(Schema.String),
  isNarrowViewport: Schema.Boolean,
  maybeIsPlaygroundSupported: Schema.Option(Schema.Boolean),
  playground: Schema.Option(Playground),
  sidebarGroups: SidebarGroups,
  coreBlockPage: BlockPage,
  maybeHome: Schema.Option(Home),
  themeMenu: ThemeMenu,
  maybeThemePreference: Schema.Option(ThemePreference),
  systemTheme: ResolvedTheme,
  resolvedTheme: ResolvedTheme,
  uiPages: Ui,
  comingFromReact: ComingFromReact,
  apiReference: ApiReference,
  exampleDetail: ExampleDetail,
  search: Search,
})
export type Model = typeof Model.Type
