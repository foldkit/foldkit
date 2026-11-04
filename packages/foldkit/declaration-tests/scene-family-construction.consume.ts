import { Effect, Layer } from 'effect'

import {
  CatalogConstructionError,
  CatalogLayer,
  CatalogSettings,
  Fruit,
  FruitCatalogBlock,
  catalogFixture,
  catalogStory,
  providedRoutedScene,
  providedUnroutedScene,
  routedScene,
  unroutedScene,
} from './scene-family-construction.accepted.js'

type Assert<Condition extends true> = Condition
type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <
    Value,
  >() => Value extends Right ? 1 : 2
    ? true
    : false

export type SharedLayerHasNoError = Assert<
  Equal<Layer.Error<typeof CatalogLayer>, never>
>
export type SharedLayerHasNoRequirements = Assert<
  Equal<Layer.Services<typeof CatalogLayer>, never>
>
export type UnroutedConstructorError = Assert<
  Equal<Effect.Error<typeof unroutedScene>, CatalogConstructionError>
>
export type UnroutedConstructorRequirements = Assert<
  Equal<Effect.Services<typeof unroutedScene>, CatalogSettings>
>
export type RoutedConstructorError = Assert<
  Equal<Effect.Error<typeof routedScene>, CatalogConstructionError>
>
export type RoutedConstructorRequirements = Assert<
  Equal<Effect.Services<typeof routedScene>, CatalogSettings>
>
export type StoryConstructorError = Assert<
  Equal<Effect.Error<typeof catalogStory>, CatalogConstructionError>
>
export type StoryConstructorRequirements = Assert<
  Equal<Effect.Services<typeof catalogStory>, CatalogSettings>
>
export type FixtureConstructorError = Assert<
  Equal<Effect.Error<typeof catalogFixture>, CatalogConstructionError>
>
export type FixtureConstructorRequirements = Assert<
  Equal<Effect.Services<typeof catalogFixture>, CatalogSettings>
>
export type ExactSelectedItem = Assert<
  Equal<
    typeof FruitCatalogBlock.Model.Type.maybeSelected,
    import('effect').Option.Option<Fruit>
  >
>
export type ProvidedUnroutedError = Assert<
  Equal<Effect.Error<typeof providedUnroutedScene>, CatalogConstructionError>
>
export type ProvidedRoutedError = Assert<
  Equal<Effect.Error<typeof providedRoutedScene>, CatalogConstructionError>
>
export type ProvidedUnroutedRequirements = Assert<
  Equal<Effect.Services<typeof providedUnroutedScene>, never>
>
export type ProvidedRoutedRequirements = Assert<
  Equal<Effect.Services<typeof providedRoutedScene>, never>
>
