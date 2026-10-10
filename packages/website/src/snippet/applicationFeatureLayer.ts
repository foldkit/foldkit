import { Layer } from 'effect'

import { LoadProducts } from './command'
import { managedResources } from './managedResource'
import { MeasureProductGrid } from './mount'
import * as Reviews from './reviews'
import { ProductCatalogLayer } from './service'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.provide(
  Layer.mergeAll(
    LoadProducts.layer,
    subscriptions.productUpdates.layer,
    MeasureProductGrid.layer,
    managedResources.productPreview.layer,
    Reviews.EffectsLayer,
  ),
  ProductCatalogLayer,
)
