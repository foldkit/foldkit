import { Option, pipe } from 'effect'
import { type Block } from 'foldkit'
import { modifyFields } from 'foldkit/struct'

import { DialogBlock } from '@foldkit/ui/dialog'

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
import { ApplicationBlock, makeNoopStep, makeStep } from '../definition'
import { ApplicationRoute, maybeExampleSlugForRoute } from '../route'
import { ApplyTheme, SaveThemePreference, resolveTheme } from '../theme'
import { type ThemePreference } from '../themePreference'
import * as ThemeMenu from '../view/themeMenu'
import { MaybeHomeBinding } from './home'

export const SearchBinding = ApplicationBlock.makeBinding(SearchBlock, {
  field: 'search',
})

export const SnippetCopyBinding = ApplicationBlock.makeBinding(
  SnippetCopyBlock,
  {
    field: 'snippetCopy',
  },
)

export const SnippetDisclosureBinding = ApplicationBlock.makeBinding(
  SnippetDisclosureBlock,
  {
    field: 'snippetDisclosure',
  },
)

export const ExampleDetailBinding = ApplicationBlock.makeBinding(
  ExampleDetailBlock,
  {
    field: 'exampleDetail',
    init: {
      contextToArgs: ({ route, maybeExampleSources }) => [
        maybeExampleSlugForRoute(route),
        maybeExampleSources,
      ],
    },
  },
)

export const PlaygroundBinding = ApplicationBlock.makeBinding(PlaygroundBlock, {
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

export const UiPagesBinding = ApplicationBlock.makeBinding(UiBlock, {
  field: 'uiPages',
  init: { contextToArgs: ({ today }) => [today] },
})

export const ApiReferenceBinding = ApplicationBlock.makeBinding(
  ApiReferenceBlock,
  {
    field: 'apiReference',
    init: { contextToArgs: ({ maybeApiData }) => [maybeApiData] },
  },
)

export const ComingFromReactBinding = ApplicationBlock.makeBinding(
  ComingFromReactBlock,
  {
    field: 'comingFromReact',
  },
)

export const CoreBlockPageBinding = ApplicationBlock.makeBinding(
  BlockPageBlock,
  {
    field: 'coreBlockPage',
  },
)

export const MobileMenuDialogBinding = ApplicationBlock.makeBinding(
  DialogBlock,
  {
    field: 'mobileMenuDialog',
    init: { contextToArgs: () => [{ id: 'mobile-menu' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(DialogBlock, {
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

export const ThemeMenuBinding = ApplicationBlock.makeBinding(
  ThemeMenu.ThemeMenuBlock,
  {
    field: 'themeMenu',
    init: { contextToArgs: () => [{ id: 'theme-menu' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationBlock.makeOutMessageFold(ThemeMenu.ThemeMenuBlock, {
    Selected: ({ value }) => applyThemePreference(value),
    Closed: makeNoopStep,
  }),
})

export const ApplicationComposition = ApplicationBlock.makeComposition({
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
