import { Layer } from 'effect'

import { ProductCatalogLayer } from './catalog'
import { LoadProducts } from './command'
import { managedResources } from './managedResource'
import { MeasureProductGrid } from './mount'
import { subscriptions } from './subscription'

export const EffectsLayer = Layer.provide(
  Layer.mergeAll(
    LoadProducts.layer,
    subscriptions.productUpdates.layer,
    MeasureProductGrid.layer,
    managedResources.productPreview.layer,
  ),
  ProductCatalogLayer,
)
