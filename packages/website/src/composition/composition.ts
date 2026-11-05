import { Option, pipe } from 'effect'
import { type Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { DialogBlock } from '@foldkit/ui/dialog'

import {
  makeBinding,
  makeComposition,
  makeNoopStep,
  makeOutMessageFold,
  makeStep,
} from '../block'
import {
  ApiReferenceBlock,
  BlockPageBlock,
  ComingFromReactBlock,
  ExampleDetailBlock,
  PlaygroundBlock,
  SearchBlock,
  SnippetCopyBlock,
  SnippetDisclosureBlock,
  UiBlock,
} from '../blocks'
import { ApplicationRoute, maybeExampleSlugForRoute } from '../route'
import { ApplyTheme, SaveThemePreference, resolveTheme } from '../theme'
import { type ThemePreference } from '../themePreference'
import * as ThemeMenu from '../view/themeMenu'
import { MaybeHomeBinding } from './home'

export const SearchBinding = makeBinding(SearchBlock, {
  field: 'search',
})

export const SnippetCopyBinding = makeBinding(SnippetCopyBlock, {
  field: 'snippetCopy',
})

export const SnippetDisclosureBinding = makeBinding(SnippetDisclosureBlock, {
  field: 'snippetDisclosure',
})

export const ExampleDetailBinding = makeBinding(ExampleDetailBlock, {
  field: 'exampleDetail',
  init: {
    contextToArgs: ({ route, maybeExampleSources }) => [
      maybeExampleSlugForRoute(route),
      maybeExampleSources,
    ],
  },
})

export const PlaygroundBinding = makeBinding(PlaygroundBlock, {
  field: 'playground',
  init: {
    contextToArgs: ({ route }) =>
      pipe(
        route,
        Option.liftPredicate(ApplicationRoute.guards.Playground),
        Option.map(route => [route.exampleSlug]),
      ),
  },
})

export const UiPagesBinding = makeBinding(UiBlock, {
  field: 'uiPages',
  init: { contextToArgs: ({ today }) => [today] },
})

export const ApiReferenceBinding = makeBinding(ApiReferenceBlock, {
  field: 'apiReference',
  init: { contextToArgs: ({ maybeApiData }) => [maybeApiData] },
})

export const ComingFromReactBinding = makeBinding(ComingFromReactBlock, {
  field: 'comingFromReact',
})

export const CoreBlockPageBinding = makeBinding(BlockPageBlock, {
  field: 'coreBlockPage',
})

export const MobileMenuDialogBinding = makeBinding(DialogBlock, {
  field: 'mobileMenuDialog',
  init: { contextToArgs: () => [{ id: 'mobile-menu' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(DialogBlock, {
    Opened: makeNoopStep,
    Closed: makeNoopStep,
    CompletedClose: makeNoopStep,
  }),
})

const applyThemePreference = (preference: ThemePreference) =>
  makeStep(model => {
    const resolvedTheme = resolveTheme(preference, model.systemTheme)

    return {
      model: modifyFields(model, {
        maybeThemePreference: () => Option.some(preference),
        resolvedTheme: () => resolvedTheme,
      }),
      commands: [
        ApplyTheme({ theme: resolvedTheme }),
        SaveThemePreference({ preference }),
      ],
    }
  })

export const ThemeMenuBinding = makeBinding(ThemeMenu.ThemeMenuBlock, {
  field: 'themeMenu',
  init: { contextToArgs: () => [{ id: 'theme-menu' }] },
}).withOutMessagePolicy({
  fold: makeOutMessageFold(ThemeMenu.ThemeMenuBlock, {
    Selected: ({ value }) => applyThemePreference(value),
    Closed: makeNoopStep,
  }),
})

export const ApplicationComposition = makeComposition({
  bindings: [
    ApiReferenceBinding,
    ComingFromReactBinding,
    CoreBlockPageBinding,
    ExampleDetailBinding,
    MaybeHomeBinding,
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
