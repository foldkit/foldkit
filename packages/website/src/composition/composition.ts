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
import { ApplicationDefinition, makeNoopStep, makeStep } from '../definition'
import { ApplicationRoute, maybeExampleSlugForRoute } from '../route'
import { ApplyTheme, SaveThemePreference, resolveTheme } from '../theme'
import { type ThemePreference } from '../themePreference'
import * as ThemeMenu from '../view/themeMenu'
import { MaybeHomeBinding } from './home'

export const SearchBinding = ApplicationDefinition.makeBinding(SearchBlock, {
  field: 'search',
})

export const SnippetCopyBinding = ApplicationDefinition.makeBinding(
  SnippetCopyBlock,
  {
    field: 'snippetCopy',
  },
)

export const SnippetDisclosureBinding = ApplicationDefinition.makeBinding(
  SnippetDisclosureBlock,
  {
    field: 'snippetDisclosure',
  },
)

export const ExampleDetailBinding = ApplicationDefinition.makeBinding(
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

export const PlaygroundBinding = ApplicationDefinition.makeBinding(
  PlaygroundBlock,
  {
    field: 'playground',
    init: {
      contextToArgs: ({ route }) =>
        pipe(
          route,
          Option.liftPredicate(ApplicationRoute.guards.Playground),
          Option.map(route => [route.exampleSlug]),
        ),
    },
  },
)

export const UiPagesBinding = ApplicationDefinition.makeBinding(UiBlock, {
  field: 'uiPages',
  init: { contextToArgs: ({ today }) => [today] },
})

export const ApiReferenceBinding = ApplicationDefinition.makeBinding(
  ApiReferenceBlock,
  {
    field: 'apiReference',
    init: { contextToArgs: ({ maybeApiData }) => [maybeApiData] },
  },
)

export const ComingFromReactBinding = ApplicationDefinition.makeBinding(
  ComingFromReactBlock,
  {
    field: 'comingFromReact',
  },
)

export const CoreBlockPageBinding = ApplicationDefinition.makeBinding(
  BlockPageBlock,
  {
    field: 'coreBlockPage',
  },
)

export const MobileMenuDialogBinding = ApplicationDefinition.makeBinding(
  DialogBlock,
  {
    field: 'mobileMenuDialog',
    init: { contextToArgs: () => [{ id: 'mobile-menu' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(DialogBlock, {
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

export const ThemeMenuBinding = ApplicationDefinition.makeBinding(
  ThemeMenu.ThemeMenuBlock,
  {
    field: 'themeMenu',
    init: { contextToArgs: () => [{ id: 'theme-menu' }] },
  },
).withOutMessagePolicy({
  fold: ApplicationDefinition.makeOutMessageFold(ThemeMenu.ThemeMenuBlock, {
    Selected: ({ value }) => applyThemePreference(value),
    Closed: makeNoopStep,
  }),
})

export const ApplicationComposition = ApplicationDefinition.makeComposition({
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
