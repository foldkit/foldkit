import { Schema } from 'effect'
import { Url } from 'foldkit/url'

import { DialogBlock } from '@foldkit/ui'

import { Deployment } from './deployment'
import { ResolvedTheme } from './message'
import {
  ApiReferenceBlock,
  BlockPageBlock,
  ComingFromReactBlock,
  ExampleDetailBlock,
  HomeBlock,
  PlaygroundBlock,
  UiBlock,
} from './page'
import { ApplicationRoute } from './route'
import * as Search from './search'
import { SidebarGroups } from './sidebarStorage'
import * as SnippetCopy from './snippetCopy'
import * as SnippetDisclosure from './snippetDisclosure'
import { ThemePreference } from './themePreference'
import { ThemeMenuBlock } from './view/themeMenu'

export const Model = Schema.Struct({
  route: ApplicationRoute,
  url: Url,
  deployment: Deployment,
  snippetCopy: SnippetCopy.SnippetCopyBlock.Model,
  snippetDisclosure: SnippetDisclosure.SnippetDisclosureBlock.Model,
  maybeGitHubStarCount: Schema.Option(Schema.Number),
  currentYear: Schema.Number,
  newsletterEmail: Schema.String,
  mobileMenuDialog: DialogBlock.Model,
  isMobileTableOfContentsOpen: Schema.Boolean,
  activeSection: Schema.Option(Schema.String),
  isNarrowViewport: Schema.Boolean,
  maybeIsPlaygroundSupported: Schema.Option(Schema.Boolean),
  playground: Schema.Option(PlaygroundBlock.Model),
  sidebarGroups: SidebarGroups,
  coreBlockPage: BlockPageBlock.Model,
  maybeHome: Schema.Option(HomeBlock.Model),
  themeMenu: ThemeMenuBlock.Model,
  maybeThemePreference: Schema.Option(ThemePreference),
  systemTheme: ResolvedTheme,
  resolvedTheme: ResolvedTheme,
  uiPages: UiBlock.Model,
  comingFromReact: ComingFromReactBlock.Model,
  apiReference: ApiReferenceBlock.Model,
  exampleDetail: ExampleDetailBlock.Model,
  search: Search.SearchBlock.Model,
})
