import { Option, pipe } from 'effect'
import { type Block } from 'foldkit'

import { Dialog } from '@foldkit/ui'

import { Application } from '../definition'
import { Message } from '../message'
import {
  ApiReference,
  ComingFromReact,
  CoreBlockPage,
  ExampleDetail,
  Playground,
  Ui,
} from '../page'
import { ApplicationRoute } from '../route'
import * as Search from '../search'
import * as SnippetCopy from '../snippetCopy'
import * as SnippetDisclosure from '../snippetDisclosure'
import { selectThemePreference } from '../theme'
import { ThemeMenu } from '../view/themeMenu'
import { HomeBinding } from './home'

export const SearchBinding = Application.bindChild(Search.block, {
  field: 'search',
  parentMessage: Message.GotSearchMessage,
})

export const SnippetCopyBinding = Application.bindChild(SnippetCopy.block, {
  field: 'snippetCopy',
  parentMessage: Message.GotSnippetCopyMessage,
})

export const SnippetDisclosureBinding = Application.bindChild(
  SnippetDisclosure.block,
  {
    field: 'snippetDisclosure',
    parentMessage: Message.GotSnippetDisclosureMessage,
  },
)

export const ExampleDetailBinding = Application.bindChild(ExampleDetail.block, {
  field: 'exampleDetail',
  parentMessage: Message.GotExampleDetailMessage,
})

export const PlaygroundBinding = Application.bindChild(Playground.block, {
  field: 'playground',
  parentMessage: Message.GotPlaygroundMessage,
  init: {
    args: ({ route }) =>
      pipe(
        route,
        Option.liftPredicate(ApplicationRoute.guards.Playground),
        Option.map(route => [route.exampleSlug]),
      ),
  },
})

export const UiPagesBinding = Application.bindChild(Ui.block, {
  field: 'uiPages',
  parentMessage: Message.GotUiPageMessage,
  init: { args: ({ today }) => [today] },
})

export const ApiReferenceBinding = Application.bindChild(ApiReference.block, {
  field: 'apiReference',
  parentMessage: Message.GotApiReferenceMessage,
})

export const ComingFromReactBinding = Application.bindChild(
  ComingFromReact.block,
  {
    field: 'comingFromReact',
    parentMessage: Message.GotComingFromReactMessage,
  },
)

export const CoreBlockPageBinding = Application.bindChild(CoreBlockPage.block, {
  field: 'coreBlockPage',
  parentMessage: Message.GotCoreBlockPageMessage,
})

const foldMobileMenuDialogOutMessage = Dialog.OutMessage.match({
  Opened: () => Application.step(model => ({ model })),
  Closed: () => Application.step(model => ({ model })),
})

export const MobileMenuDialogBinding = Application.bindChild(Dialog.block, {
  field: 'mobileMenuDialog',
  parentMessage: Message.GotMobileMenuDialogMessage,
  outMessage: { fold: foldMobileMenuDialogOutMessage },
  init: { args: () => [{ id: 'mobile-menu' }] },
})

const foldThemeMenuOutMessage = ThemeMenu.OutMessage.match({
  Selected: ({ value }) => selectThemePreference(value),
})

export const ThemeMenuBinding = Application.bindChild(ThemeMenu, {
  field: 'themeMenu',
  parentMessage: Message.GotThemeMenuMessage,
  outMessage: { fold: foldThemeMenuOutMessage },
  init: { args: () => [{ id: 'theme-menu' }] },
})

export const ApplicationComposition = Application.makeComposition({
  childBindings: [
    ApiReferenceBinding,
    ComingFromReactBinding,
    CoreBlockPageBinding,
    ExampleDetailBinding,
    HomeBinding,
    MobileMenuDialogBinding,
    PlaygroundBinding,
    SearchBinding,
    SnippetCopyBinding,
    SnippetDisclosureBinding,
    ThemeMenuBinding,
    UiPagesBinding,
  ],
})
export type ApplicationViewBuilder = Block.ViewBuilderFor<
  typeof ApplicationComposition
>
