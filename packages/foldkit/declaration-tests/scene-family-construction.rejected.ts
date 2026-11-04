import { Effect } from 'effect'
import * as Scene from 'foldkit/scene'

import {
  CatalogLayer,
  FruitCatalogBlock,
  providedRoutedScene,
  providedUnroutedScene,
  routedScene,
  unroutedScene,
} from './scene-family-construction.accepted.js'

// @ts-expect-error Unrouted Scene construction still requires CatalogSettings.
Effect.runPromise(unroutedScene.pipe(Effect.catch(() => Effect.void)))
// @ts-expect-error Routed Scene construction still requires CatalogSettings.
Effect.runPromise(routedScene.pipe(Effect.catch(() => Effect.void)))
// @ts-expect-error Providing Services does not erase the unrouted constructor failure.
export const infallibleUnrouted: Effect.Effect<void> = providedUnroutedScene
// @ts-expect-error Providing Services does not erase the routed constructor failure.
export const infallibleRouted: Effect.Effect<void> = providedRoutedScene

const selection = { block: FruitCatalogBlock, layer: CatalogLayer }

Scene.scene(
  // @ts-expect-error Required view inputs retain their exact Item Schema.
  { ...selection, viewInputs: { items: ['Orange'] } },
  Scene.init('Fruit'),
)

Scene.scene(
  // @ts-expect-error The initializer retains its required string argument.
  { ...selection, viewInputs: { items: ['Apple'] } },
  Scene.init(1),
)
